<template>
  <q-dialog v-model="dialogModel" backdrop-filter="blur(4px) saturate(150%)">
    <q-card style="width: 95%; max-width: 380px" class="q-pa-md">
      <q-card-section class="q-pb-sm text-center">
        <div class="text-h6 text-weight-medium">Choose payment method</div>
        <div v-if="fiatPrice" class="text-caption text-grey-6 q-mt-xs">
          Fiat price: <span v-text="fiatPrice"></span>
        </div>
      </q-card-section>
      <q-card-actions vertical class="q-gutter-y-md q-pt-md">
        <q-btn
          color="secondary"
          text-color="primary"
          icon="currency_bitcoin"
          label="Pay with bitcoin"
          class="full-width text-capitalize"
          unelevated
          no-wrap
          @click="selectPayment('bitcoin')"
        />
        <q-btn
          outline
          color="secondary"
          icon="credit_card"
          label="Pay with fiat"
          class="full-width text-capitalize"
          no-wrap
          @click="selectPayment('fiat')"
        />
        <q-btn
          flat
          color="grey"
          icon="close"
          label="Cancel"
          class="full-width text-capitalize"
          no-wrap
          @click="selectPayment(null)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import {computed} from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  fiatPrice: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'select'])

const dialogModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const selectPayment = method => {
  emit('update:modelValue', false)
  emit('select', method)
}
</script>
