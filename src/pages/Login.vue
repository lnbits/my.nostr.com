<template>
  <q-page class="flex flex-center">
    <q-card
      v-if="isTermsAndConditionsRequest"
      v-bind:style="
        q.screen.lt.sm
          ? { width: '80%', marginTop: '3.5rem' }
          : { width: '70%', minWidth: '350px' }
      "
    >
      <q-card-section v-if="termsAndConditions">
        <div v-html="termsAndConditions"></div>
        <q-separator></q-separator>
        <q-btn
          label="Agree and Register"
          @click="register"
          type="submit"
          color="secondary"
          class="full-width q-mt-sm text-capitalize"
          :disable="inProgress"
        />
        <q-btn
          @click="isTermsAndConditionsRequest = false"
          label="Back"
          type="button"
          class="full-width q-mt-md"
          color="grey"
        />
      </q-card-section>
      <q-card-section v-else class="q-ma-xl q-pa-md"
        >Terms and Conditions loading....
      </q-card-section>
    </q-card>
    <q-card
      v-else
      v-bind:style="
        q.screen.lt.sm
          ? { width: '80%', marginTop: '3.5rem' }
          : { width: '30%', minWidth: '350px', maxWidth: '400px' }
      "
    >
      <q-card-section class="q-mb-md">
        <q-avatar
          :size="$q.screen.gt.sm ? '150px' : '100px'"
          class="absolute-center shadow-10"
          color="primary"
        >
          <img src="~assets/nostrich-head-32.svg" class="q-pa-md" />
        </q-avatar>
      </q-card-section>
      <q-card-section>
        <div
          class="text-center"
          :style="{ marginTop: q.screen.gt.sm ? '3rem' : '1rem' }"
        >
          <div v-if="isSignupRequest" class="col text-h6 ellipsis">
            Register
          </div>
          <div v-else class="col text-h6 ellipsis">Login</div>
        </div>
        <div class="text-center q-pt-lg">
          <div class="col ellipsis">
            Manage your <strong>Nostr</strong> accounts.
          </div>
        </div>
      </q-card-section>
      <q-card-section>
        <div v-if="!isSignupRequest && !loginMode">
          <q-btn
            label="Login"
            icon="login"
            type="button"
            color="primary"
            class="full-width text-capitalize"
            :disable="inProgress"
            @click="showLoginOptions"
          />

          <div class="q-mt-sm text-center">
            <span>or</span>
          </div>

          <q-btn
            label="Register"
            @click="signup"
            type="button"
            color="secondary"
            class="full-width q-mt-sm text-capitalize"
            :disable="inProgress"
          />
        </div>

        <div v-else-if="!isSignupRequest && isLoginOptions">
          <q-btn
            label="Login with Username"
            icon="person"
            type="button"
            color="primary"
            class="full-width text-capitalize"
            :disable="inProgress"
            @click="showUsernameLogin"
          />
          <q-btn
            label="Login with Nostr Extension"
            icon="extension"
            type="button"
            color="primary"
            class="full-width q-mt-sm text-capitalize"
            :disable="inProgress"
            @click="loginWithExtension"
          />
          <q-btn
            label="Login with Nostr Remote Signer"
            icon="vpn_key"
            type="button"
            color="primary"
            class="full-width q-mt-sm text-capitalize"
            :disable="inProgress"
            @click="showRemoteSignerLogin"
          />
          <q-linear-progress
            v-if="inProgress"
            indeterminate
            color="secondary"
            class="q-mt-sm"
          />

          <q-btn
            @click="resetLoginOptions"
            label="Back"
            type="button"
            class="full-width q-mt-md"
            color="grey"
          />
        </div>

        <div v-else-if="!isSignupRequest && isRemoteSignerLogin">
          <q-tabs
            v-model="remoteSignerMode"
            dense
            active-color="primary"
            indicator-color="primary"
            class="text-primary"
          >
            <q-tab name="bunker" icon="link" label="bunker://" />
            <q-tab
              name="nostrconnect"
              icon="qr_code_2"
              label="nostrconnect://"
            />
          </q-tabs>

          <q-tab-panels v-model="remoteSignerMode" animated>
            <q-tab-panel name="bunker" class="q-px-none">
              <q-input
                filled
                v-model="remoteSignerBunkerInput"
                label="bunker:// connection string"
                type="textarea"
                autogrow
                :disable="inProgress"
                @keydown.enter.prevent="loginWithRemoteSignerBunker"
              />

              <q-btn
                label="Connect"
                icon="login"
                type="button"
                color="primary"
                class="full-width q-mt-sm text-capitalize"
                :disable="!canLoginWithRemoteSignerBunker"
                :loading="inProgress && remoteSignerMode === 'bunker'"
                @click="loginWithRemoteSignerBunker"
              />
            </q-tab-panel>

            <q-tab-panel name="nostrconnect" class="q-px-none">
              <q-input
                filled
                v-model="remoteSignerRelayInput"
                label="Pairing relay"
                placeholder="wss://relay.example.com"
                :disable="inProgress"
                @keydown.enter.prevent="createRemoteSignerPairing"
              />

              <q-btn
                label="Generate Pairing Link"
                icon="add_link"
                type="button"
                color="primary"
                class="full-width q-mt-sm text-capitalize"
                :disable="!canCreateRemoteSignerPairing"
                :loading="inProgress && remoteSignerMode === 'nostrconnect'"
                @click="createRemoteSignerPairing"
              />

              <div
                v-if="remoteSignerConnectUri"
                class="q-mt-md text-center remote-signer-pairing"
              >
                <vue-qrcode
                  :value="remoteSignerConnectUri"
                  :options="{width: 220}"
                ></vue-qrcode>
                <q-input
                  filled
                  readonly
                  type="textarea"
                  autogrow
                  label="nostrconnect://"
                  :model-value="remoteSignerConnectUri"
                  class="q-mt-sm text-left"
                />
                <div class="row q-col-gutter-sm q-mt-sm">
                  <div class="col-6">
                    <q-btn
                      label="Copy"
                      icon="content_copy"
                      type="button"
                      color="primary"
                      outline
                      class="full-width text-capitalize"
                      @click="copyRemoteSignerConnectUri"
                    />
                  </div>
                  <div class="col-6">
                    <q-btn
                      label="Open"
                      icon="open_in_new"
                      type="button"
                      color="primary"
                      outline
                      class="full-width text-capitalize"
                      @click="openRemoteSignerConnectUri"
                    />
                  </div>
                </div>
              </div>
            </q-tab-panel>
          </q-tab-panels>

          <q-banner
            v-if="remoteSignerAuthUrl"
            dense
            rounded
            class="q-mt-sm bg-grey-2 text-primary"
          >
            <template v-slot:avatar>
              <q-icon name="verified_user" color="primary" />
            </template>
            <a
              :href="remoteSignerAuthUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary"
              >Open signer authorization</a
            >
          </q-banner>

          <q-banner
            v-if="remoteSignerError"
            dense
            rounded
            class="q-mt-sm bg-orange-1 text-negative"
          >
            <template v-slot:avatar>
              <q-icon name="warning_amber" color="warning" />
            </template>
            {{ remoteSignerError }}
          </q-banner>

          <q-btn
            v-if="inProgress"
            label="Cancel"
            icon="close"
            type="button"
            color="negative"
            flat
            class="full-width q-mt-sm text-capitalize"
            @click="cancelRemoteSignerLogin"
          />

          <q-btn
            @click="goBackToLoginOptions"
            label="Back"
            type="button"
            class="full-width q-mt-md"
            color="grey"
            :disable="inProgress"
          />
        </div>

        <q-form v-else @submit="onSubmit">
          <q-input
            filled
            v-model="username"
            :rules="[checkUsername]"
            label="Username"
            lazy-rules
          />

          <q-input
            type="password"
            filled
            v-model="password"
            :rules="[checkPassword]"
            label="Password"
            lazy-rules
          />

          <q-input
            v-if="isSignupRequest"
            type="password"
            filled
            v-model="passwordRepeat"
            :rules="[checkPassword]"
            label="Confirm password"
            lazy-rules
          />
          <q-linear-progress
            v-if="inProgress"
            indeterminate
            color="secondary"
            class="q-mt-sm"
          />

          <q-btn
            v-if="!this.isSignupRequest"
            label="Login"
            type="submit"
            color="primary"
            class="full-width text-capitalize"
            :disable="inProgress"
          />

          <div v-if="!this.isSignupRequest" class="q-mt-sm text-center">
            <span>or</span>
          </div>

          <q-btn
            v-if="!this.isSignupRequest"
            label="Register"
            @click="signup"
            type="button"
            color="secondary"
            class="full-width q-mt-sm text-capitalize"
            :disable="inProgress"
          />
          <q-btn
            v-else
            label="Register"
            type="submit"
            color="secondary"
            class="full-width q-mt-sm text-capitalize"
            :disable="inProgress"
          />
          <q-btn
            v-if="!this.isSignupRequest"
            @click="showLoginOptions"
            label="Back"
            type="button"
            class="full-width q-mt-md"
            color="grey"
          />
          <q-btn
            v-if="this.isSignupRequest"
            @click="resetLoginOptions"
            label="Back"
            type="button"
            class="full-width q-mt-md"
            color="grey"
          />
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script>
import { defineComponent } from "vue";
import { ref } from "vue";
import { copyToClipboard, useQuasar } from "quasar";
import { useAppStore } from "src/stores/store";
import { useNostrStore } from "src/stores/nostr";
import VueQrcode from "@chenfengyuan/vue-qrcode";

import { markdownToHTML } from "boot/utils";
import { saas } from "boot/saas";

export default defineComponent({
  components: {
    VueQrcode,
  },
  setup() {
    const $q = useQuasar();
    const $store = useAppStore();
    const $nostr = useNostrStore();
    const defaultRemoteSignerRelay = [...$nostr.relays][0] || "wss://relay.damus.io/";

    return {
      q: $q,
      store: $store,
      nostr: $nostr,
      username: ref(""),
      password: ref(""),
      passwordRepeat: ref(""),
      isSignupRequest: ref(false),
      isTermsAndConditionsRequest: ref(false),
      loginMode: ref(null),
      remoteSignerMode: ref("bunker"),
      remoteSignerBunkerInput: ref(""),
      remoteSignerRelayInput: ref(defaultRemoteSignerRelay),
      remoteSignerConnectUri: ref(""),
      remoteSignerAuthUrl: ref(""),
      remoteSignerError: ref(""),
      activeRemoteSignerLogin: ref(null),
      inProgress: ref(false),
      termsAndConditions: ref(""),
    };
  },
  async created() {
    if (this.$route.query.signup) {
      this.isSignupRequest = true;
    }
    const bunkerConnectionToken = this.readBunkerLoginQueryParam();
    if (bunkerConnectionToken) {
      this.remoteSignerMode = "bunker";
      this.remoteSignerBunkerInput = bunkerConnectionToken;
      this.loginMode = "remoteSigner";
      await this.removeBunkerLoginQueryParam();
      this.$nextTick(() => this.loginWithRemoteSignerBunker());
    }
  },
  computed: {
    isLoginOptions() {
      return this.loginMode === "options";
    },
    isRemoteSignerLogin() {
      return this.loginMode === "remoteSigner";
    },
    canLoginWithRemoteSignerBunker() {
      return this.remoteSignerBunkerInput.trim().length > 0 && !this.inProgress;
    },
    canCreateRemoteSignerPairing() {
      return this.remoteSignerRelayInput.trim().length > 0 && !this.inProgress;
    },
  },
  methods: {
    showLoginOptions() {
      this.loginMode = "options";
    },
    showUsernameLogin() {
      this.loginMode = "username";
    },
    showRemoteSignerLogin() {
      if (!this.remoteSignerRelayInput) {
        this.remoteSignerRelayInput = [...this.nostr.relays][0] || "wss://relay.damus.io/";
      }
      this.loginMode = "remoteSigner";
      this.remoteSignerError = "";
      this.remoteSignerAuthUrl = "";
    },
    goBackToLoginOptions() {
      this.cancelRemoteSignerLogin();
      this.remoteSignerBunkerInput = "";
      this.remoteSignerError = "";
      this.remoteSignerAuthUrl = "";
      this.loginMode = "options";
    },
    resetLoginOptions() {
      this.isSignupRequest = false;
      this.loginMode = null;
    },
    readBunkerLoginQueryParam() {
      const queryValue = this.$route.query.bunker;
      if (Array.isArray(queryValue)) {
        return queryValue[0] || "";
      }
      if (typeof queryValue === "string" && queryValue.trim()) {
        return queryValue;
      }

      const rawSearch = window.location.search.slice(1);
      if (rawSearch.startsWith("bunker://")) {
        try {
          return decodeURIComponent(rawSearch);
        } catch {
          return rawSearch;
        }
      }
      return "";
    },
    async removeBunkerLoginQueryParam() {
      if (!this.$route.query.bunker) {
        return;
      }
      const query = {...this.$route.query};
      delete query.bunker;
      await this.$router.replace({
        path: this.$route.path,
        query,
        hash: this.$route.hash,
      });
    },
    setRemoteSignerAuthUrl(url) {
      this.remoteSignerAuthUrl = url;
    },
    clearRemoteSignerPairingState() {
      this.remoteSignerConnectUri = "";
    },
    cancelRemoteSignerLogin() {
      this.activeRemoteSignerLogin?.cancel?.();
      this.activeRemoteSignerLogin = null;
      this.clearRemoteSignerPairingState();
      this.remoteSignerAuthUrl = "";
      this.inProgress = false;
    },
    getRemoteSignerErrorMessage(error, fallback) {
      if (error?.message?.trim()) {
        return error.message.trim();
      }
      return fallback;
    },
    finishLogin(username) {
      this.q.notify({
        message: "Logged in!",
        color: "positive",
      });
      this.store.username = username;
      let path = "/";
      if (this.store.newCartIdentifier) {
        path = "/cart";
      } else if (this.store.freeCartIdentifier) {
        path = "/identities";
      }

      setTimeout(() => this.$router.push(path), 500);
    },
    async login() {
      try {
        this.inProgress = true;
        const message = this.validateForm();
        if (message) {
          this.q.notify({
            message,
            color: "negative",
            icon: "warning",
          });
          return false;
        }
        await saas.login(this.username, this.password);
        this.finishLogin(this.username);
      } catch (error) {
        console.warn(error);
        this.q.notify({
          message: "Failed to login!",
          color: "negative",
          icon: "warning",
        });
        return false;
      } finally {
        this.inProgress = false;
      }
    },
    async loginWithExtension() {
      try {
        this.inProgress = true;
        await saas.nostrLogin();
        this.finishLogin(saas.username);
      } catch (error) {
        console.warn(error);
        this.q.notify({
          message: error.message || "Failed to login with extension!",
          caption: saas.mapErrorToString(error),
          color: "negative",
          icon: "warning",
        });
        return false;
      } finally {
        this.inProgress = false;
      }
    },
    async loginWithRemoteSignerBunker() {
      if (!this.canLoginWithRemoteSignerBunker) {
        return false;
      }
      try {
        this.inProgress = true;
        this.clearRemoteSignerPairingState();
        this.remoteSignerAuthUrl = "";
        this.remoteSignerError = "";
        await saas.nostrRemoteSignerBunkerLogin({
          connectionToken: this.remoteSignerBunkerInput,
          onAuthUrl: this.setRemoteSignerAuthUrl,
        });
        this.remoteSignerBunkerInput = "";
        this.finishLogin(saas.username);
      } catch (error) {
        console.warn(error);
        this.remoteSignerError = this.getRemoteSignerErrorMessage(
          error,
          "Failed to connect remote signer."
        );
        this.q.notify({
          message: this.remoteSignerError,
          color: "negative",
          icon: "warning",
        });
        return false;
      } finally {
        this.inProgress = false;
      }
    },
    async createRemoteSignerPairing() {
      if (!this.canCreateRemoteSignerPairing) {
        return false;
      }
      this.cancelRemoteSignerLogin();
      try {
        this.inProgress = true;
        this.remoteSignerAuthUrl = "";
        this.remoteSignerError = "";
        const login = saas.createNostrConnectLogin({
          relayUrl: this.remoteSignerRelayInput,
          onAuthUrl: this.setRemoteSignerAuthUrl,
        });
        this.activeRemoteSignerLogin = login;
        this.remoteSignerConnectUri = login.uri;
        this.remoteSignerRelayInput = login.relayUrl;
        await saas.completeNostrConnectLogin(login);
        this.activeRemoteSignerLogin = null;
        this.clearRemoteSignerPairingState();
        this.finishLogin(saas.username);
      } catch (error) {
        console.warn(error);
        const message = this.getRemoteSignerErrorMessage(
          error,
          "Failed to pair remote signer."
        );
        if (message !== "NIP-46 login was cancelled.") {
          this.remoteSignerError = message;
          this.q.notify({
            message,
            color: "negative",
            icon: "warning",
          });
        }
        return false;
      } finally {
        this.activeRemoteSignerLogin = null;
        this.inProgress = false;
      }
    },
    async copyRemoteSignerConnectUri() {
      if (!this.remoteSignerConnectUri) {
        return;
      }
      try {
        await copyToClipboard(this.remoteSignerConnectUri);
        this.q.notify({
          message: "Copied!",
          color: "positive",
        });
      } catch (error) {
        console.warn(error);
        this.q.notify({
          message: "Failed to copy pairing link.",
          color: "negative",
          icon: "warning",
        });
      }
    },
    openRemoteSignerConnectUri() {
      if (!this.remoteSignerConnectUri) {
        return;
      }
      window.open(this.remoteSignerConnectUri, "_blank", "noopener,noreferrer");
    },
    checkUsername(val) {
      return (
        (val && val.length >= 3) || "Username must have at least 3 characters"
      );
    },
    checkPassword(val) {
      return (
        (val && val.length >= 8) || "Password must have at least 8 characters"
      );
    },
    validateForm() {
      const usernameMessage = this.checkUsername(this.username);
      if (usernameMessage !== true) {
        return usernameMessage;
      }
      const passwordMessage = this.checkPassword(this.password);
      if (passwordMessage !== true) {
        return passwordMessage;
      }
      return null;
    },
    validateSignupForm() {
      const message = this.validateForm();
      if (message) {
        return message;
      }
      const passwordRepeatMessage = this.checkPassword(this.passwordRepeat);
      if (passwordRepeatMessage !== true) {
        return passwordRepeatMessage;
      }
      if (this.password !== this.passwordRepeat) {
        return "Passwords do not match!";
      }

      return null;
    },

    async onSubmit() {
      if (this.isSignupRequest) {
        await this.signup();
      } else {
        await this.login();
      }
    },
    async showTermsAndConditions() {
      this.isTermsAndConditionsRequest = true;
      this.termsAndConditions = await markdownToHTML(
        process.env.termsAndConditionsUrl
      );
    },
    async signup() {
      if (!this.isSignupRequest) {
        this.isSignupRequest = true;
        this.loginMode = "username";
        return;
      }
      const message = this.validateSignupForm();
      if (message) {
        this.q.notify({
          message,
          color: "negative",
          icon: "warning",
        });
        return;
      }
      this.showTermsAndConditions();
    },
    async register() {
      try {
        this.inProgress = true;
        await saas.signup(this.username, this.password, this.passwordRepeat);
        this.q.notify({
          message: "Signed Up!",
          color: "positive",
        });
        this.store.username = this.username;
        setTimeout(() => this.$router.push("/"), 500);
      } catch (error) {
        console.warn(error);
        this.q.notify({
          message: "Failed to register!",
          caption: error.response?.data?.detail,
          color: "negative",
          icon: "warning",
        });
        return false;
      } finally {
        this.inProgress = false;
      }
    },
  },
});
</script>

<style lang="scss">
.bg-image {
  background: $primary;
  background: linear-gradient(
    142deg,
    $primary 0%,
    $primary 75%,
    $secondary 120%
  );

  svg {
    opacity: 50%;
  }
}
</style>
