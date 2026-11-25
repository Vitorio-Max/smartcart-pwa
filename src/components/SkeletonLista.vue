<template>
  <div class="space-y-3" role="status">
    <span class="sr-only">Cargando…</span>

    <div class="h-12 rounded-2xl bg-slate-200 animate-pulse"></div>

    <div class="flex gap-2">
      <div v-for="n in 3" :key="n" class="h-10 w-24 rounded-full bg-slate-200 animate-pulse"></div>
    </div>

    <div
      v-for="n in 5"
      :key="'fila-' + n"
      class="bg-white p-3.5 rounded-2xl border border-slate-200/80 flex items-center gap-3"
    >
      <div class="flex-1 space-y-2.5">
        <div class="h-4 w-3/5 rounded bg-slate-200 animate-pulse"></div>
        <div class="h-3 w-2/5 rounded bg-slate-100 animate-pulse"></div>
      </div>
      <div class="w-12 h-11 rounded-xl bg-slate-200 animate-pulse"></div>
    </div>
  </div>
</template>
