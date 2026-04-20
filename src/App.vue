<template>
  <TilemapEditorWindow v-if="isTilemapEditorWindow" />
  <EditorLayout v-else />
</template>

<script setup lang="ts">
import EditorLayout from './components/layout/EditorLayout.vue'
import TilemapEditorWindow from './components/windows/TilemapEditorWindow.vue'

const isTilemapEditorWindow = new URLSearchParams(window.location.search).get('tilemapEditor') === '1'
</script>
