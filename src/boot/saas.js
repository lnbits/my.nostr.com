import axios from "axios";

// if (!process.env.DEV) {
axios.defaults.withCredentials = true;
// }

const saas = {
  domain: process.env.domainID,
  url: process.env.apiUrl,
  serverTime: null,

  username: localStorage.getItem("username"),

  signup: async function (username, password, password2) {
    const { data } = await axios({
      method: "POST",
      url: `${this.url}/api/v1/auth/register`,
      data: {
        username,
        password,
        password_repeat: password2,
      },
    });

    this.username = username;
    localStorage.setItem("username", username);

    return data;
  },
  login: async function (username, password) {
    const { data } = await axios({
      method: "POST",
      url: `${this.url}/api/v1/auth`,
      data: {
        username,
        password,
      },
    });

    this.username = username;
    localStorage.setItem("username", username);

    return data;
  },
  logout: async function () {
    const response = await axios({
      method: "POST",
      url: `${this.url}/api/v1/auth/logout`,
    });
    this.username = null;
    localStorage.clear();
    return response;
  },
  getAccountDetails: async function () {
    const response = await axios({
      method: "GET",
      url: `${this.url}/api/v1/auth`,
    });
    return response;
  },
  getAuthenticatedUser: async function () {
    const response = await axios({
      method: "GET",
      url: `${this.url}/api/v1/auth`,
    });

    return response;
  },
  updateUserPassword: async function (data) {
    const response = await axios({
      method: "PUT",
      url: `${this.url}/api/v1/auth/password`,
      data: { ...data },
    });
    return response;
  },

  // NIP05
  queryIdentifier: async function (identifier) {
    const response = await axios({
      method: "GET",
      url: `${this.url}/nostrnip5/api/v1/domain/${this.domain}/search?q=${identifier}`,
    });
    return response;
  },
  getUserIdentities: async function ({ localPart, active } = {}) {
    let url = `${this.url}/nostrnip5/api/v1/user/addresses`;

    const response = await axios({
      method: "GET",
      url,
      params: {
        local_part: localPart,
        active,
      },
    });

    return response;
  },
  updateIdentity: async function (addressId, data) {
    const response = await axios({
      method: "PUT",
      url: `${this.url}/nostrnip5/api/v1/user/domain/${this.domain}/address/${addressId}`,
      data,
    });

    return response;
  },
  deleteIdentity: async function (addressId) {
    const response = await axios({
      method: "DELETE",
      url: `${this.url}/nostrnip5/api/v1/user/domain/${this.domain}/address/${addressId}`,
    });

    return response;
  },
  createIdentity: async function (data, createInvoice = false) {
    // todo: extract object
    const response = await axios({
      method: "POST",
      url: `${this.url}/nostrnip5/api/v1/user/domain/${this.domain}/address`,
      data: {
        domain_id: this.domain,
        local_part: data.identifier,
        pubkey: data.pubkey,
        years: data.years,
        promo_code: data.promo_code,
        referer: data.referer,
        create_invoice: createInvoice,
      },
    });

    return response;
  },
  checkIdentityPayment: async function (paymentHash) {
    const response = await axios({
      method: "GET",
      url: `${this.url}/nostrnip5/api/v1/user/domain/${this.domain}/payments/${paymentHash}`,
    });

    return response;
  },

  updateLNaddress: async function (addressId, data) {
    const response = await axios({
      method: "PUT",
      url: `${this.url}/nostrnip5/api/v1/user/domain/${this.domain}/address/${addressId}/lnaddress`,
      data,
    });

    return response;
  },

  mapAddressToProfile(address) {
    return {
      id: address.id,
      active: address.active,
      name: address.local_part,
      pubkey: address.pubkey,
      relays: address.config.relays,
      ln_address: address.config.ln_address,
      expiresAt: address.expires_at,
    };
  },

  mapErrorToString(error) {
    const data = error.response?.data;
    if (!data) {
      return;
    }
    if (typeof data === "string") {
      return data;
    }
    return data?.detail?.map((d) => d.msg).join(", ");
  },
};


(async () => {
  axios.interceptors.response.use(
    (response) => response,
    (err) => {
      if (err?.response?.status === 401) {
        saas.logout();
        if (window.location.pathname !== "/login") {
          setTimeout(() => (window.location.href = "/login"), 500);
        }
      }
      return Promise.reject(err);
    }
  );
})();

export { saas };
