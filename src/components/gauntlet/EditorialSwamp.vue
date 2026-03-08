<template>
  <!-- Skeleton loader: shown while the 850ms delay is pending -->
  <div v-if="loading" class="x-wrap-outer css-k9m2p1">
    <div class="x-inner-block css-3xt7lq">
      <div class="css-skel-bar css-b1 x-skel-title"></div>
      <div class="css-skel-bar css-b2 x-skel-meta"></div>
      <div class="css-skel-bar css-b3 x-skel-body"></div>
      <div class="css-skel-bar css-b4 x-skel-body"></div>
      <div class="css-skel-bar css-b5 x-skel-body-short"></div>
    </div>
  </div>

  <!-- Actual content: rendered after 850ms -->
  <div v-else class="x-wrap-outer css-k9m2p1">
    <div class="x-inner-block css-3xt7lq">
      <div class="x-content-head css-9vz4wr">
        <div class="x-ttl-wrap css-1y8xz">
          <span class="x-eyebrow css-ev3nt">Analysis</span>
          <div class="x-main-ttl css-hd2f9a">{{ payload.title }}</div>
        </div>
        <div class="x-meta-row css-mta7b2">
          <div class="x-byline-wrap css-byl9x1">
            <span class="x-by css-pfx-by">By</span>
            <span class="x-author css-auth-nm">{{ payload.author }}</span>
          </div>
          <div class="x-date-wrap css-dt8z3c">
            <span class="x-pub css-dt-lbl">Published</span>
            <span class="x-pub-dt css-dt-val">{{ payload.date }}</span>
          </div>
        </div>
      </div>
      <div class="x-body-wrap css-bd9xp4">
        <div class="x-para css-p-blk">{{ payload.body }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

const loading = ref(true);

const payload = {
  title: 'The Quiet Collapse of the Attention Economy',
  author: 'Meridith Voss',
  date: 'March 8, 2026',
  body: 'For nearly two decades, the dominant model of the web was predicated on a single axiom: human attention is a finite and therefore monetisable resource. Platforms competed not on the quality of information they surfaced but on the sheer duration of the gaze they could hold. The consequences—fragmented discourse, eroded trust, a generation of products engineered to exploit cognitive bias—are now impossible to ignore. What is emerging in its wake is not a clean replacement but a slow, contested renegotiation of what it means to be useful online.',
};

onMounted(() => {
  setTimeout(() => {
    loading.value = false;
  }, 850);
});
</script>

<style scoped>
.x-wrap-outer {
  font-family: system-ui, sans-serif;
  padding: 2rem;
  max-width: 720px;
  margin: 0 auto;
  color: #1a1a1a;
}

/* Skeleton bars */
.css-skel-bar {
  background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 4px;
  margin-bottom: 0.75rem;
}
.css-b1 { height: 2rem; width: 75%; }
.css-b2 { height: 1rem; width: 45%; }
.css-b3 { height: 1rem; width: 100%; }
.css-b4 { height: 1rem; width: 95%; }
.css-b5 { height: 1rem; width: 60%; }

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Content styles */
.x-eyebrow {
  display: block;
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #888;
  margin-bottom: 0.4rem;
}
.x-main-ttl {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.25;
  margin-bottom: 0.75rem;
}
.x-meta-row {
  display: flex;
  gap: 1.5rem;
  font-size: 0.85rem;
  color: #555;
  margin-bottom: 1.5rem;
  border-top: 1px solid #e5e5e5;
  border-bottom: 1px solid #e5e5e5;
  padding: 0.5rem 0;
}
.x-by { margin-right: 0.25rem; color: #999; }
.x-pub { margin-right: 0.25rem; color: #999; }
.x-author { font-weight: 600; color: #1a1a1a; }
.x-pub-dt { font-weight: 600; color: #1a1a1a; }
.x-para {
  font-size: 1rem;
  line-height: 1.75;
  color: #333;
}
</style>
