<template>
  <q-page class="q-pa-sm container">
    <div class="q-gutter-md">
      <q-breadcrumbs class="text-grey-4 q-mb-lg" active-color="secondary">
        <q-breadcrumbs-el icon="home" to="/" />
        <q-breadcrumbs-el label="Wallets" />
      </q-breadcrumbs>
    </div>

    <div class="id-card row q-mt-md">
      <div
        v-for="wallet in wallets"
        class="q-pa-sm col-xs-12 col-sm-6 col-md-4 col-lg-3"
      >
        <router-link
          :to="{
            path: `/wallets/${wallet.id}`,
          }"
        >
          <q-card class="nostr-card no-shadow cursor-pointer" bordered>
            <q-card-section class="text-center">
              <q-avatar size="150px">
                <LNbitsIcon color="primary" />
              </q-avatar>
            </q-card-section>

            <q-card-section class="q-pt-none text-center text-white">
              <div class="text-h6">
                <span v-text="wallet.name"></span>
              </div>
              <div class="text-caption ellipsis">
                <span v-text="wallet.balance_msat / 1000"></span>
                <strong> sats</strong>
              </div>
            </q-card-section>
          </q-card>
        </router-link>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { useQuasar } from "quasar";
import { onMounted, ref } from "vue";
import LNbitsIcon from "components/LNbitsIcon.vue";
import { useNostrStore } from "src/stores/nostr"
import { saas } from "boot/saas";

const $nostr = useNostrStore();
const $q = useQuasar();
const wallets = ref([]);

const getAccountWallets = async () => {
  try {
    const { data } = await saas.getAccountDetails();
    return data.wallets;
  } catch (error) {
    console.error(error);
    $q.notify({
      message: "Failed to get user wallets!",
      caption: error.response?.data?.detail,
      color: "negative",
    });
  }
  return []
};

onMounted(async () => {
  const userWallets = await getAccountWallets();
  wallets.value = userWallets
  $nostr.wallets = userWallets
});
</script>

<style lang="scss">
.responsive {
  canvas {
    width: 100% !important;
    height: auto !important;
    object-fit: contain;
  }
}

.id-card a {
  text-decoration: none;
}
</style>
