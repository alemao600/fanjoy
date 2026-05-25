// ========================================
// Fanjoy API - Supabase (Frontend Only)
// ========================================

(function initFanjoyApi() {
  const SUPABASE_URL = window.FANJOY_SUPABASE_URL || "";
  const SUPABASE_ANON_KEY = window.FANJOY_SUPABASE_ANON_KEY || "";

  if (!window.supabase || !window.supabase.createClient) {
    console.error("Supabase SDK não carregado. Verifique o script CDN.");
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Supabase não configurado. Defina FANJOY_SUPABASE_URL e FANJOY_SUPABASE_ANON_KEY em js/supabase-config.js");
  }

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "fanjoy_supabase_auth"
    }
  });

  function ok(data, message) {
    return { success: true, data: data || {}, message: message || null };
  }

  function fail(message) {
    return { success: false, message: message || "Erro inesperado" };
  }

  async function getSessionUser() {
    const { data: userData, error: userError } = await sb.auth.getUser();
    if (!userError && userData?.user) return userData.user;

    // Fallback: when getUser fails transiently, try local session object
    const { data: sessionData } = await sb.auth.getSession();
    if (sessionData?.session?.user) return sessionData.session.user;
    return null;
  }

  async function getCustomerProfileByUserId(userId) {
    const { data, error } = await sb
      .from("customers")
      .select("id, user_id, name, last_name, email, phone, cpf")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return data;
  }

  async function getCustomerAddresses(customerId) {
    const { data, error } = await sb
      .from("customer_addresses")
      .select("id, label, cep, street, number, complement, neighborhood, city, state, is_default")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async function ensureCustomerProfile(user) {
    let profile = await getCustomerProfileByUserId(user.id);
    if (profile) return profile;

    const meta = user.user_metadata || {};
    const fallbackName = meta.name || (user.email ? user.email.split("@")[0] : "Cliente");

    const { data, error } = await sb
      .from("customers")
      .upsert(
        {
          user_id: user.id,
          name: fallbackName,
          last_name: meta.last_name || "",
          email: user.email || "",
          phone: meta.phone || "",
          cpf: null
        },
        { onConflict: "user_id" }
      )
      .select("id, user_id, name, last_name, email, phone, cpf")
      .single();

    if (error) throw error;
    return data;
  }

  async function buildCustomerPayload(user) {
    const profile = await ensureCustomerProfile(user);

    const addresses = await getCustomerAddresses(profile.id);

    return {
      _id: profile.id,
      id: profile.id,
      userId: profile.user_id,
      name: profile.name,
      lastName: profile.last_name,
      email: profile.email,
      phone: profile.phone,
      cpf: profile.cpf,
      addresses: addresses.map((a) => ({
        _id: a.id,
        id: a.id,
        label: a.label,
        cep: a.cep,
        street: a.street,
        number: a.number,
        complement: a.complement,
        neighborhood: a.neighborhood,
        city: a.city,
        state: a.state,
        isDefault: a.is_default
      }))
    };
  }

  // ========================================
  // Auth
  // ========================================

  const AuthAPI = {
    async register(userData) {
      try {
        const payload = {
          email: userData.email,
          password: userData.password,
          options: {
            data: {
              name: userData.name,
              last_name: userData.lastName || "",
              phone: userData.phone || ""
            }
          }
        };

        const { data, error } = await sb.auth.signUp(payload);
        if (error) return fail(error.message);

        if (data.user) {
          const upsertPayload = {
            user_id: data.user.id,
            name: userData.name,
            last_name: userData.lastName || "",
            email: userData.email,
            phone: userData.phone || "",
            cpf: userData.cpf || null
          };

          const { error: upsertError } = await sb
            .from("customers")
            .upsert(upsertPayload, { onConflict: "user_id" });

          if (upsertError) return fail(upsertError.message);
        }

        return ok({ user: data.user }, "Conta criada com sucesso");
      } catch (err) {
        return fail(err.message);
      }
    },

    async login(credentials) {
      try {
        const { data, error } = await sb.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password
        });

        if (error) return fail(error.message);

        const customer = await buildCustomerPayload(data.user);
        if (!customer) return fail("Perfil do cliente não encontrado");

        sessionStorage.setItem("fanjoy_customer_logged", "true");
        sessionStorage.setItem("fanjoy_customer_id", customer._id);
        sessionStorage.setItem("fanjoy_customer_name", customer.name || "Cliente");

        return ok({ token: data.session?.access_token || "supabase-session", customer });
      } catch (err) {
        return fail(err.message);
      }
    },

    async adminLogin(credentials) {
      return fail("Login admin é local na página login.html");
    },

    async logout() {
      await sb.auth.signOut();
      sessionStorage.removeItem("fanjoy_customer_logged");
      sessionStorage.removeItem("fanjoy_customer_id");
      sessionStorage.removeItem("fanjoy_customer_name");
      localStorage.removeItem("fanjoy_token");
      window.location.href = "index.html";
    },

    isAuthenticated() {
      try {
        const raw = localStorage.getItem("fanjoy_supabase_auth");
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        return !!(parsed?.access_token || parsed?.currentSession?.access_token || parsed?.session?.access_token);
      } catch {
        return false;
      }
    }
  };

  // ========================================
  // Products
  // ========================================

  function mapProduct(row) {
    return {
      _id: row.id,
      id: row.id,
      name: row.name,
      description: row.description,
      price: Number(row.price || 0),
      images: row.images && row.images.length ? row.images : [row.image_url || ""],
      image: row.image_url || (row.images && row.images[0]) || "",
      tag: row.tag,
      buttonText: row.button_text || "Comprar",
      stock: row.stock || 0,
      categories: (row.product_categories || []).map((pc) => ({
        id: pc.categories?.id,
        name: pc.categories?.name,
        slug: pc.categories?.slug
      })).filter((c) => c.name)
    };
  }

  async function syncProductCategories(productId, categoryNames) {
    const cleanNames = Array.from(new Set((categoryNames || []).map((n) => String(n || "").trim()).filter(Boolean)));

    const { error: deleteError } = await sb.from("product_categories").delete().eq("product_id", productId);
    if (deleteError) throw deleteError;

    if (!cleanNames.length) return;

    const links = [];
    for (const name of cleanNames) {
      const slug = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const { data: cat, error: catError } = await sb
        .from("categories")
        .upsert({ name, slug }, { onConflict: "slug" })
        .select("id")
        .single();

      if (catError) throw catError;
      links.push({ product_id: productId, category_id: cat.id });
    }

    if (links.length) {
      const { error: linkError } = await sb.from("product_categories").insert(links);
      if (linkError) throw linkError;
    }
  }

  const ProductsAPI = {
    async getAll() {
      try {
        const { data, error } = await sb
          .from("products")
          .select("id, name, description, price, image_url, images, tag, button_text, stock, product_categories(categories(id, name, slug))")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (error) return fail(error.message);
        return ok({ products: (data || []).map(mapProduct) });
      } catch (err) {
        return fail(err.message);
      }
    },

    async getById(id) {
      try {
        const { data, error } = await sb
          .from("products")
          .select("id, name, description, price, image_url, images, tag, button_text, stock, product_categories(categories(id, name, slug))")
          .eq("id", id)
          .single();
        if (error) return fail(error.message);
        return ok(mapProduct(data));
      } catch (err) {
        return fail(err.message);
      }
    },

    async create(productData) {
      try {
        const { data, error } = await sb
          .from("products")
          .insert({
            name: productData.name,
            description: productData.description,
            price: productData.price,
            image_url: productData.image || (productData.images || [])[0] || null,
            images: productData.images || (productData.image ? [productData.image] : []),
            tag: productData.tag || null,
            button_text: productData.buttonText || "Comprar",
            stock: productData.stock || 0,
            is_active: true
          })
          .select()
          .single();
        if (error) return fail(error.message);
        await syncProductCategories(data.id, productData.categories || []);
        return ok(data);
      } catch (err) {
        return fail(err.message);
      }
    },

    async update(id, productData) {
      try {
        const { data, error } = await sb
          .from("products")
          .update({
            name: productData.name,
            description: productData.description,
            price: productData.price,
            image_url: productData.image || (productData.images || [])[0] || null,
            images: productData.images || (productData.image ? [productData.image] : []),
            tag: productData.tag || null,
            button_text: productData.buttonText || "Comprar",
            stock: productData.stock || 0
          })
          .eq("id", id)
          .select()
          .single();
        if (error) return fail(error.message);
        await syncProductCategories(id, productData.categories || []);
        return ok(data);
      } catch (err) {
        return fail(err.message);
      }
    },

    async delete(id) {
      try {
        const { error } = await sb.from("products").delete().eq("id", id);
        if (error) return fail(error.message);
        return ok({ deleted: true });
      } catch (err) {
        return fail(err.message);
      }
    }
  };

  // ========================================
  // Categories
  // ========================================

  const CategoriesAPI = {
    async getAll() {
      try {
        const { data, error } = await sb.from("categories").select("id, name, slug").order("name");
        if (error) return fail(error.message);
        return ok(data || []);
      } catch (err) {
        return fail(err.message);
      }
    },

    async create(categoryData) {
      try {
        const raw = categoryData.name || "";
        const slug = raw.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        const { data, error } = await sb.from("categories").insert({ name: raw, slug }).select().single();
        if (error) return fail(error.message);
        return ok(data);
      } catch (err) {
        return fail(err.message);
      }
    }
  };

  // ========================================
  // Customers
  // ========================================

  const CustomersAPI = {
    async getProfile() {
      try {
        const user = await getSessionUser();
        if (!user) return fail("Não autenticado");

        const customer = await buildCustomerPayload(user);
        if (!customer) return fail("Perfil não encontrado");

        return ok(customer);
      } catch (err) {
        return fail(err.message);
      }
    },

    async updateProfile(profileData) {
      try {
        const user = await getSessionUser();
        if (!user) return fail("Não autenticado");

        const { error } = await sb
          .from("customers")
          .update({
            name: profileData.name,
            last_name: profileData.lastName,
            email: profileData.email,
            phone: profileData.phone,
            cpf: profileData.cpf || null
          })
          .eq("user_id", user.id);

        if (error) return fail(error.message);

        const customer = await buildCustomerPayload(user);
        return ok(customer);
      } catch (err) {
        return fail(err.message);
      }
    },

    async addAddress(addressData) {
      try {
        const user = await getSessionUser();
        if (!user) return fail("Não autenticado");

        const customer = await getCustomerProfileByUserId(user.id);
        if (!customer) return fail("Perfil não encontrado");

        if (addressData.isDefault) {
          await sb.from("customer_addresses").update({ is_default: false }).eq("customer_id", customer.id);
        }

        const { error } = await sb.from("customer_addresses").insert({
          customer_id: customer.id,
          label: addressData.label || "Endereço",
          cep: addressData.cep,
          street: addressData.street,
          number: addressData.number,
          complement: addressData.complement || null,
          neighborhood: addressData.neighborhood,
          city: addressData.city,
          state: addressData.state,
          is_default: !!addressData.isDefault
        });

        if (error) return fail(error.message);
        const updated = await buildCustomerPayload(user);
        return ok(updated);
      } catch (err) {
        return fail(err.message);
      }
    },

    async updateAddress(addressId, addressData) {
      try {
        const user = await getSessionUser();
        if (!user) return fail("Não autenticado");

        const customer = await getCustomerProfileByUserId(user.id);
        if (!customer) return fail("Perfil não encontrado");

        if (addressData.isDefault) {
          await sb.from("customer_addresses").update({ is_default: false }).eq("customer_id", customer.id);
        }

        const { error } = await sb
          .from("customer_addresses")
          .update({
            label: addressData.label || "Endereço",
            cep: addressData.cep,
            street: addressData.street,
            number: addressData.number,
            complement: addressData.complement || null,
            neighborhood: addressData.neighborhood,
            city: addressData.city,
            state: addressData.state,
            is_default: !!addressData.isDefault
          })
          .eq("id", addressId)
          .eq("customer_id", customer.id);

        if (error) return fail(error.message);
        const updated = await buildCustomerPayload(user);
        return ok(updated);
      } catch (err) {
        return fail(err.message);
      }
    },

    async deleteAddress(addressId) {
      try {
        const user = await getSessionUser();
        if (!user) return fail("Não autenticado");

        const customer = await getCustomerProfileByUserId(user.id);
        if (!customer) return fail("Perfil não encontrado");

        const { error } = await sb
          .from("customer_addresses")
          .delete()
          .eq("id", addressId)
          .eq("customer_id", customer.id);

        if (error) return fail(error.message);
        const updated = await buildCustomerPayload(user);
        return ok(updated);
      } catch (err) {
        return fail(err.message);
      }
    }
  };

  // ========================================
  // Orders
  // ========================================

  async function getOrderItemsWithProducts(orderId) {
    const { data, error } = await sb
      .from("order_items")
      .select("id, quantity, price, product_id, products(name)")
      .eq("order_id", orderId);

    if (error) throw error;

    return (data || []).map((item) => ({
      id: item.id,
      quantity: item.quantity,
      price: Number(item.price || 0),
      product: {
        id: item.product_id,
        name: item.products?.name || "Produto"
      }
    }));
  }

  const OrdersAPI = {
    async create(orderData) {
      try {
        const user = await getSessionUser();
        if (!user) return fail("Não autenticado");

        const customer = await getCustomerProfileByUserId(user.id);
        if (!customer) return fail("Perfil não encontrado");

        const now = Date.now().toString().slice(-8);

        const { data: order, error: orderError } = await sb
          .from("orders")
          .insert({
            customer_id: customer.id,
            order_number: "FAJ-" + now,
            status: "pending",
            payment_status: "pending",
            shipping_address: orderData.shippingAddress || {},
            subtotal: orderData.subtotal,
            shipping: orderData.shipping,
            total: orderData.total
          })
          .select()
          .single();

        if (orderError) return fail(orderError.message);

        const itemsPayload = (orderData.items || []).map((item) => ({
          order_id: order.id,
          product_id: item.product,
          quantity: item.quantity,
          price: item.price
        }));

        if (itemsPayload.length > 0) {
          const { error: itemsError } = await sb.from("order_items").insert(itemsPayload);
          if (itemsError) return fail(itemsError.message);
        }

        return ok({
          _id: order.id,
          id: order.id,
          orderNumber: order.order_number,
          total: Number(order.total || 0),
          status: order.status,
          createdAt: order.created_at
        });
      } catch (err) {
        return fail(err.message);
      }
    },

    async getMyOrders() {
      try {
        const user = await getSessionUser();
        if (!user) return fail("Não autenticado");

        const customer = await getCustomerProfileByUserId(user.id);
        if (!customer) return fail("Perfil não encontrado");

        const { data: orders, error } = await sb
          .from("orders")
          .select("id, order_number, status, total, tracking_code, created_at")
          .eq("customer_id", customer.id)
          .order("created_at", { ascending: false });

        if (error) return fail(error.message);

        const mappedOrders = [];
        for (const order of orders || []) {
          const items = await getOrderItemsWithProducts(order.id);
          mappedOrders.push({
            _id: order.id,
            id: order.id,
            orderNumber: order.order_number,
            status: order.status,
            total: Number(order.total || 0),
            trackingCode: order.tracking_code,
            createdAt: order.created_at,
            items
          });
        }

        return ok({ orders: mappedOrders });
      } catch (err) {
        return fail(err.message);
      }
    },

    async getById() {
      return fail("Não implementado nesta versão");
    },

    async getAllAdmin() {
      return fail("Não implementado nesta versão");
    },

    async updateStatus() {
      return fail("Não implementado nesta versão");
    }
  };

  // ========================================
  // Payments
  // ========================================

  const PaymentsAPI = {
    async createPreference() {
      return fail("Mercado Pago requer backend seguro. Nesta versão Supabase frontend-only, checkout gera pedido sem redirecionamento externo.");
    },
    async getStatus() {
      return ok({ status: "pending" });
    }
  };

  const AdminAPI = {
    async getDashboard() {
      const productsRes = await ProductsAPI.getAll();
      return ok({
        productsCount: productsRes.success ? productsRes.data.products.length : 0
      });
    }
  };

  function formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  }

  function validateCPF(cpf) {
    const normalized = String(cpf || "").replace(/\D/g, "");
    if (normalized.length !== 11) return false;
    if (/^(\d)\1+$/.test(normalized)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i += 1) sum += Number(normalized[i]) * (10 - i);
    let digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    if (digit !== Number(normalized[9])) return false;

    sum = 0;
    for (let j = 0; j < 10; j += 1) sum += Number(normalized[j]) * (11 - j);
    digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    return digit === Number(normalized[10]);
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");
  }

  function maskPhone(value) {
    let v = String(value || "").replace(/\D/g, "");
    if (v.length <= 11) {
      v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
      v = v.replace(/(\d)(\d{4})$/, "$1-$2");
    }
    return v;
  }

  function maskCEP(value) {
    let v = String(value || "").replace(/\D/g, "");
    if (v.length <= 8) v = v.replace(/^(\d{5})(\d)/, "$1-$2");
    return v;
  }

  function maskCPF(value) {
    let v = String(value || "").replace(/\D/g, "");
    if (v.length <= 11) {
      v = v.replace(/(\d{3})(\d)/, "$1.$2");
      v = v.replace(/(\d{3})(\d)/, "$1.$2");
      v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return v;
  }

  window.FanjoyAPI = {
    Auth: AuthAPI,
    Products: ProductsAPI,
    Orders: OrdersAPI,
    Customers: CustomersAPI,
    Payments: PaymentsAPI,
    Categories: CategoriesAPI,
    Admin: AdminAPI,
    Utils: {
      formatCurrency,
      formatDate,
      validateCPF,
      validateEmail,
      maskPhone,
      maskCEP,
      maskCPF
    }
  };

  console.log("Fanjoy API inicializada com Supabase");
})();



