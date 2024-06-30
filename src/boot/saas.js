import axios from "axios";

if (!process.env.DEV) {
  axios.defaults.withCredentials = true;
}

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
  // NIP05
  queryIdentifier: async function (identifier) {
    const response = await axios({
      method: "GET",
      url: `${this.url}/nostrnip5/api/v1/domain/${this.domain}/search?q=${identifier}`,
    });
    return response;
  },
  getUsrAddresses: async function () {
    const response = await axios({
      method: "GET",
      url: `${this.url}/nostrnip5/api/v1/addresses/user`,
    });

    return response;
  },
  // createInstance: async function () {
  //   return axios({
  //     method: "POST",
  //     url: this.url + "/instance",
  //   });
  // },

  // updateInstance: function (id, action) {
  //   return axios({
  //     method: "PUT",
  //     url: this.url + "/instance",

  //     data: {
  //       action: action,
  //       instance_id: id,
  //     },
  //   });
  // },
  // getInstances: async function () {
  //   const response = await axios({
  //     method: "GET",
  //     url: this.url + "/instance",
  //   });

  //   return response;
  // },
  // getUserInstancesLogs: async function () {
  //   const response = await axios({
  //     method: "GET",
  //     url: this.url + "/instance/logs",
  //   });

  //   return response;
  // },
  // getInstancesLogs: async function (id) {
  //   const response = await axios({
  //     method: "GET",
  //     url: this.url + `/instance/${id}/logs`,
  //   });

  //   return response;
  // },
  // status: async function () {
  //   const response = await axios({
  //     method: "GET",
  //     url: this.url,
  //   });

  //   this.serverTime = response.data.timestamp;

  //   return response;
  // },

  // mapInstance: function (instance) {
  //   const progress = (start, stop, serverTime) => {
  //     if (!serverTime) {
  //       return 0;
  //     }
  //     if (stop - start <= 0 || stop - serverTime <= 0) {
  //       return 100;
  //     }

  //     const percentage = (1 - (stop - serverTime) / (stop - start)) * 100;

  //     return Math.floor(percentage);
  //   };

  //   const status = (active, enabled) => {
  //     if (!active) {
  //       return "Not Paid";
  //     }
  //     if (!enabled) {
  //       return "Disabled";
  //     }
  //     return "Runnning";
  //   };

  //   const timeLeft = Math.floor(
  //     Math.max(instance.timestamp_stop - this.serverTime, 0)
  //   );
  //   return {
  //     id: instance.id,
  //     instanceLink: `https://${instance.domain}/wallet`,
  //     backupLink: `https://${instance.domain}/admin/api/v1/backup`,
  //     enabled: instance.is_enabled,
  //     active: instance.is_active,
  //     expired: instance.timestamp_stop < this.serverTime,
  //     name: instance.domain,
  //     createdDate: new Date(instance.timestamp * 1000).toLocaleString(),
  //     stopDate: new Date(instance.timestamp_stop * 1000).toLocaleString(),
  //     timestamp: instance.timestamp,
  //     timestampStart: instance.timestamp_start,
  //     timestampStop: instance.timestamp_stop,
  //     lnurl: instance.lnurl,
  //     timeLeft: timeLeft,
  //     timeLeftFormatted: secondsToDhm(timeLeft),
  //     statusText: status(instance.is_active, instance.is_enabled),
  //     progress: progress(
  //       instance.timestamp_start || instance.timestamp,
  //       instance.timestamp_stop,
  //       this.serverTime
  //     ),
  //   };
  // },
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

// DISABLED FOR TESTING PURPOSES
// (async () => {
//   axios.interceptors.response.use(
//     (response) => response,
//     (err) => {
//       if (err?.response?.status === 401) {
//         saas.logout();
//         if (window.location.pathname !== "/login") {
//           setTimeout(() => (window.location.href = "/login"), 500);
//         }
//       }
//       return Promise.reject(err);
//     }
//   );
// })();

export { saas };
