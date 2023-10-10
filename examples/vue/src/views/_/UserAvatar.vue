<template>
  <v-avatar color="info" size="44" class="pointer" @click="dialog = true">
    <span class="text-h5">{{ name.substring(0, 1) }}</span>

    <v-dialog v-model="dialog" width="auto">
      <v-card>
        <v-card-text>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore
          magna aliqua.
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" block @click="dialog = false">Close Dialog</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-avatar>
</template>

<script setup>
import {ref} from 'vue'
const name = ref('')
name.value = 'ss'

const dialog = ref(false)
</script>
