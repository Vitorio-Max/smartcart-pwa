<template>
  <nav
    aria-label="Navegación principal"
    class="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 pb-[env(safe-area-inset-bottom)]"
  >
    <div class="max-w-lg mx-auto grid grid-cols-3">
      <button
        v-for="t in tabs"
        :key="t.id"
        @click="$emit('update:tabActiva', t.id)"
        :aria-current="tabActiva === t.id ? 'page' : undefined"
        :class="[
          'h-16 flex flex-col items-center justify-center gap-0.5 text-xs font-bold transition',
          tabActiva === t.id ? 'text-emerald-600' : 'text-slate-400 active:text-slate-600'
        ]"
      >
        <span class="relative">
          <component :is="t.icon" :size="24" :stroke-width="tabActiva === t.id ? 2.5 : 2" />
          <span
            v-if="badges[t.id]"
            class="absolute -top-1.5 -right-3 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center tabular-nums"
          >
            {{ badges[t.id] }}
          </span>
        </span>
        {{ t.label }}
      </button>
    </div>
  </nav>
</template>

<script setup>
import { ListChecks, Star, Package } from 'lucide-vue-next';

defineProps({
  tabActiva: String,
  badges: { type: Object, default: () => ({}) },
});
defineEmits(['update:tabActiva']);

const tabs = [
  { id: 'lista', label: 'Lista', icon: ListChecks },
  { id: 'basicos', label: 'Básicos', icon: Star },
  { id: 'despensa', label: 'Despensa', icon: Package },
];
</script>