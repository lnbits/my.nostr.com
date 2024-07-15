<template>
  <q-page class="q-pa-sm container">
    <div class="q-gutter-md">
      <q-breadcrumbs class="text-grey-4 q-mb-lg" active-color="secondary">
        <q-breadcrumbs-el icon="home" to="/" />
        <q-breadcrumbs-el label="Cart" />
      </q-breadcrumbs>
    </div>

    <div>
      <q-list
        v-for="cartItem in filteredIdentities"
        class="nostr-card no-shadow q-ma-lg"
        bordered
      >
        <q-item-label header class="text-weight-bold text-white"
          >Nostr NIP05 Identifier</q-item-label
        >
        <q-item>
          <q-item-section avatar>
            <q-avatar>
              <q-img
                v-if="
                  $nostr.profiles.has(cartItem.pubkey) &&
                  $nostr.profiles.get(cartItem.pubkey).picture
                "
                :src="$nostr.profiles.get(cartItem.pubkey).picture"
                spinner-color="secondary"
                spinner-size="52px"
                :ratio="1"
              />
              <NostrHeadIcon v-else color="blue-grey-4" />
            </q-avatar>
          </q-item-section>

          <q-item-section>
            <q-item-label caption lines="2">
              <span class="text-weight-bold text-white text-h6">
                {{ cartItem.local_part }}</span
              >
            </q-item-label>
          </q-item-section>

          <q-item-section side top>
            <q-btn-dropdown
              class="text-capitalize"
              :label="
                cartItem.years + ' Year' + (cartItem.years > 1 ? 's' : '')
              "
              size="md"
              rounded
              color="secondary"
              text-color="primary"
            >
              <q-list v-for="(year, index) in allowedYearsToBuy" :key="index">
                <q-item
                  clickable
                  v-close-popup
                  @click="cartItem.years = year"
                  :active="isSameYear(cartItem.years, year)"
                  active-class="bg-teal-1 text-grey-8"
                  ><q-item-section>
                    <q-item-label
                      v-text="year + ' Year' + (year > 1 ? 's' : '')"
                    ></q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>
            <!-- <span class="q-mt-lg">&nbsp</span> {{ timeFromNow(cartItem.time * 1000) }} -->
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section avatar> </q-item-section>
          <q-item-section>
            <q-input
              dark
              standout
              v-model="cartItem.pubkey"
              label="Public Key"
              hint="Public key associated with this identifier. Hex or Npub format."
            />
          </q-item-section>
        </q-item>
        <q-item class="q-mt-md q-mb-sm">
          <q-item-section avatar> </q-item-section>
          <q-item-section>
            <q-btn
              @click="submitIdentityBuy(cartItem)"
              :label="priceLabel(cartItem.config)"
              class="text-capitalize float-left"
              rounded
              color="secondary"
              text-color="primary"
            ></q-btn>
          </q-item-section>
          <q-item-section class="col-8">
            <!-- todo:find better way to ocupy this space -->
            <span>&nbsp;</span>
          </q-item-section>

          <q-item-section side>
            {{ timeFromNow(cartItem.time * 1000) }}
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <q-dialog
      v-model="dataDialog"
      :backdrop-filter="'blur(4px) saturate(150%)'"
      @hide="resetDataDialog"
    >
      <q-card
        v-if="paymentDetails?.payment_request"
        style="width: 350px"
        class="q-pa-md text-center"
      >
        <h6><span>Identity: </span><span v-text="dialogHandle"></span></h6>
        <p class="caption">
          Scan the QR code below using a lightning wallet to secure your Nostr
          identity.
        </p>
        <div class="responsive">
          <a :href="'lightning:' + paymentDetails.payment_request">
            <vue-qrcode
              :value="paymentDetails.payment_request"
              :options="{ width: 500 }"
            ></vue-qrcode>
          </a>
        </div>
        <q-linear-progress indeterminate color="secondary" class="q-mt-sm" />
        <div class="row q-mt-md">
          <q-btn
            rounded
            unelevated
            text-color="primary"
            color="secondary"
            @click="copyData(paymentDetails.payment_request)"
            label="Copy Invoice"
            class="text-capitalize"
          ></q-btn>
          <q-btn
            @click="resetDataDialog"
            flat
            color="grey"
            class="q-ml-auto text-capitalize"
            label="Close"
          ></q-btn>
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { useQuasar, copyToClipboard } from "quasar";
import { useAppStore } from "src/stores/store";
import { useNostrStore } from "src/stores/nostr";
import { onMounted, ref, watch } from "vue";
import { saas } from "boot/saas";
import { timeFromNow } from "src/boot/utils";

import NostrHeadIcon from "components/NostrHeadIcon.vue";
import VueQrcode from "@chenfengyuan/vue-qrcode";

const $q = useQuasar();
const $store = useAppStore();
const $nostr = useNostrStore();

let paymentCheckInterval;

const filterText = ref("");
const handleData = ref({});
const showSearch = ref(false);

const allowedYearsToBuy = ref([1, 2, 3, 4, 5]);

const identities = ref([]);
const filteredIdentities = ref([]);
const identityNotOwned = ref(true);
const identitiesDisplay = ref(true);

const dataDialog = ref(false);
const dialogHandle = ref("");
const dialogPubkey = ref("");
const dialogHandleReadonly = ref(false);

const paymentDetails = ref({});

const isSameYear = (y1, y2) => {
  console.log("### y1", y1, y2, y1 === y2);
  return y1 === y2;
};

const priceLabel = (config) => {
  return `Buy for ${config.price} ${config.currency}`;
};

const getIdentities = async (_new) => {
  try {
    const { data } = await saas.getUsrIdentities({ active: false });
    identities.value = data.filter((i) => !i.active);
    data.forEach((i) => {
      $nostr.addPubkey(i.pubkey);
      i.years = 1;
    });
    const pendingIdentifier = _new ? [{ local_part: _new, years: 1 }] : [];
    filteredIdentities.value = pendingIdentifier.concat(identities.value);

    console.log("Identities: ", data);
  } catch (error) {
    console.error("error", error);
  }
};

const submitIdentityBuy = async (cartItem) => {
  try {
    const { data } = await saas.createIdentity(
      cartItem.local_part,
      cartItem.pubkey,
      cartItem.years
    );

    console.log("Identity created: ", data);
    // resetDataDialog();
    // await getIdentities();
    if (data.payment_request) {
      paymentDetails.value = { ...data };
      dataDialog.value = true;
      paymentCheckInterval = setInterval(
        async () => await paymentChecker(),
        5000
      );
      $q.notify({
        message: "Pay the invoice to complete the purchase",
        color: "positive",
        position: "bottom",
        timeout: 5000,
      });
    }
  } catch (error) {
    console.error("Error buying identifier: ", error);
    $q.notify({
      message: "Failed to generate invoice",
      caption: error.response?.data?.detail,
      color: "negative",
      position: "bottom",
    });
  }
};

const resetDataDialog = () => {
  dialogHandle.value = dialogPubkey.value = "";
  dataDialog.value = false;
  paymentDetails.value = {};
  $store.filterText = "";
  if (paymentCheckInterval) {
    clearInterval(paymentCheckInterval);
    paymentCheckInterval = null;
  }
};

const paymentChecker = async () => {
  try {
    const { data } = await saas.checkIdentityPayment(
      paymentDetails.value.payment_hash
    );
    console.log("Payment status: ", data);
    if (data.paid) {
      clearInterval(paymentCheckInterval);
      paymentCheckInterval = null;
      $q.notify({
        message: "Payment successful",
        color: "positive",
        position: "bottom",
        timeout: 2000,
      });
      resetDataDialog();
      await getIdentities();
    }
  } catch (error) {
    console.error("Error checking payment: ", error);
  }
};

const copyData = (data) => {
  copyToClipboard(data);

  $q.notify({
    message: "Copied",
    color: "grey",
  });
};

const filterIdentifier = (id, filter) => {
  if (!filterText.value) {
    return true;
  }
  if (id.local_part.toLowerCase().indexOf(filter) !== -1) {
    return true;
  }
  if (id.pubkey.toLowerCase().indexOf(filter) !== -1) {
    return true;
  }
  return false;
};

watch(filterText, (n, o) => {
  const filter = filterText.value.toLocaleLowerCase();
  filteredIdentities.value = identities.value.filter((id) =>
    filterIdentifier(id, filter)
  );
  identityNotOwned.value = !identities.value.find(
    (id) => id.local_part.toLowerCase() === filter
  );
});

const handleBuy = () => {
  dataDialog.value = true;
  dialogHandle.value = filterText.value;
  dialogHandleReadonly.value = true;
  filterText.value = "";
  showSearch.value = false;
};

// NOSTR
// TODO: MOVE/ABSTRACT TO OTHER FILE

// const pool = new SimplePool();

// let h = pool.subscribeMany(
//   $nostr.relays,
//   [
//     {
//       authors: $nostr.pubkeys,
//       kinds: [0],
//     },
//   ],
//   {
//     onevent(event) {
//       console.log("event", event);
//     },
//     // oneose() {
//     //   h.close();
//     // },
//   }
// );

onMounted(async () => {
  identities.value = [...$store.identities.values()];
  await getIdentities($store.newCartIdentifier);
  // const events = await $nostr.pool.querySync([...$nostr.relays], {
  //   authors: [...$nostr.pubkeys],
  //   kinds: [0, 10002],
  // });
  // events.forEach((event) => {
  //   switch (event.kind) {
  //     case 0:
  //       $nostr.addProfile(event);
  //       break;
  //     case 10002:
  //       const relays = getTagValues(event, "r");
  //       $nostr.addRelaysToProfile(event.pubkey, relays);
  //       relays.forEach((r) => {
  //         $nostr.addRelay(r);
  //       });

  //       break;
  //     default:
  //       break;
  //   }
  // });
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
