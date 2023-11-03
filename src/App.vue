<template>
  <div class="container" ref="container"></div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ProfileChart } from './mod';
// @ts-ignore
import renderData from '@/assets/data.json'
import type { dataInputT } from './ts/type';
const container = ref<HTMLDivElement>()
onMounted(() => {
  if (!container.value) throw new Error("dom初始化失败");
  const instance = new ProfileChart(container.value)
  instance.update(renderData as dataInputT)
})
</script>
<style>
.container {
  width: 844px;
  height: 390px;
  background-color: grey;
}
</style>
