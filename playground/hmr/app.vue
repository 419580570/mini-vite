<template>
  <div>{{ test }}</div>
  <button @click="count++">{{ count }}</button>
</template>

<script setup>
import { ref } from "vue";

const test = ref("vite-plugin test");
const count = ref(0);
</script>

<style scoped lang="less"></style>
