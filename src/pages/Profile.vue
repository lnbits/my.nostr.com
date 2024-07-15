<template v-if="loaded">
  <q-page class="q-pa-sm container">
    <div class="q-gutter-md">
      <q-breadcrumbs class="text-grey-4 q-mb-lg" active-color="secondary">
        <q-breadcrumbs-el icon="home" to="/" />
        <q-breadcrumbs-el
          label="Indentities"
          icon="alternate_email"
          to="/identities"
        />
        <q-breadcrumbs-el :label="user_details.name" />
      </q-breadcrumbs>
    </div>
    <q-card class="nostr-card text-white no-shadow" bordered>
      <q-card-section class="text-h6">
        <div class="text-h6">Edit Profile</div>
        <div class="text-subtitle2">Complete your Nostr profile</div>
      </q-card-section>
      <q-card-section class="q-pa-sm">
        <q-list dark class="row">
          <q-item class="col-lg-12 col-md-12 col-sm-12 col-xs-12">
            <q-item-section side>
              <q-avatar size="100px">
                <q-img
                  v-if="user_details.picture"
                  :src="user_details.picture"
                  spinner-color="secondary"
                  spinner-size="52px"
                  :ratio="1"
                />
                <NostrHeadIcon v-else color="secondary" />
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ user_details.name }}</q-item-label>
              <q-item-label caption class="ellipsis">{{
                user_details.pubkey
              }}</q-item-label>
            </q-item-section>
          </q-item>

          <q-item class="col-lg-6 col-md-6 col-sm-12 col-xs-12">
            <q-item-section>
              <q-input dark v-model="user_details.name" label="Name" />
            </q-item-section>
          </q-item>
          <q-item class="col-lg-6 col-md-6 col-sm-12 col-xs-12">
            <q-item-section>
              <q-input dark v-model="user_details.website" label="Website" />
            </q-item-section>
          </q-item>
          <q-item class="col-lg-12 col-md-12 col-sm-12 col-xs-12">
            <q-item-section>
              <q-input
                dark
                type="textarea"
                v-model="user_details.about"
                label="Bio"
              />
            </q-item-section>
          </q-item>
          <q-item class="col-lg-12 col-md-12 col-sm-12 col-xs-12">
            <q-item-section>
              <q-input
                dark
                filled
                v-model="addRelayValue"
                @keydown.enter="addRelayFn"
                type="text"
                label="wss://relay....."
                hint="Add a relay"
              >
                <q-btn @click="addRelayFn" dense flat icon="add"></q-btn>
              </q-input>
              <div class="q-mt-md">
                <q-chip
                  v-for="relay in user_details.relays"
                  :key="relay"
                  removable
                  @remove="removeRelayFn(relay)"
                  color="primary"
                  text-color="white"
                >
                  <span v-text="relay"></span>
                </q-chip>
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
      <q-card-actions align="right" class="q-ma-md">
        <q-btn
          tag="a"
          href="https://metadata.nostr.com"
          target="_blank"
          rounded
          class="text-capitalize"
          color="secondary"
          text-color="primary"
          label="Edit User Info"
        />
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import { useNostrStore } from "src/stores/nostr";
import { useRoute } from "vue-router";
import NostrHeadIcon from "components/NostrHeadIcon.vue";

const $nostr = useNostrStore();
const $route = useRoute();

const props = defineProps(["name"]);

const user_details = ref({});
const addRelayValue = ref("");

watch(
  () => $nostr.initiated,
  () => {
    fetchData();
  }
);

const addRelayFn = () => {
  if (!addRelayValue.value) return;
  if (user_details.value.relays.includes(addRelayValue.value)) return;
  user_details.value.relays.push(addRelayValue.value);
  addRelayValue.value = "";
};

const removeRelayFn = (relay) => {
  user_details.value.relays = user_details.value.relays.filter(
    (r) => r !== relay
  );
};

function fetchData() {
  if ($nostr.profiles.size == 0) {
    return;
  }
  const pubkey = $nostr.getPubkeyById(props.name);
  const $profile = $nostr.profiles.get(pubkey);
  user_details.value = {
    name: $profile.name,
    pubkey: $route.query.pubkey,
    picture: $profile.picture ?? null,
    website: $profile.website ?? null,
    about: $profile.about ?? null,
    relays: [...$profile.relays],
  };
}

onMounted(() => {
  fetchData();
});
</script>
