<template>
  <section class="store-page">
    <div class="store-crumb">首页 / 购物车 / 确认订单</div>
    <div class="store-section-head">
      <div>
        <h1>确认订单</h1>
        <p>选择地址并核对商品信息</p>
      </div>
      <RouterLink to="/addresses">
        <el-button>管理地址</el-button>
      </RouterLink>
    </div>

    <div class="checkout-page-layout">
      <div class="checkout-main-card">
        <div class="checkout-block">
          <div class="store-subhead">
            <h3>收货地址</h3>
          </div>
          <div v-if="normalizedAddresses.length" class="checkout-address-grid">
            <button
              v-for="address in normalizedAddresses"
              :key="address.id"
              class="checkout-address-card"
              :class="{ active: Number(selectedAddressId) === Number(address.id) }"
              type="button"
              @click="selectedAddressId = address.id"
            >
              <div class="checkout-address-top">
                <div class="checkout-address-head">
                  <strong>{{ address.receiverName }}</strong>
                  <span>{{ address.receiverPhone }}</span>
                </div>
                <div class="checkout-address-badges">
                  <el-tag v-if="address.isDefault" type="success" effect="light">默认地址</el-tag>
                  <el-tag v-if="Number(selectedAddressId) === Number(address.id)" type="danger" effect="light">已选择</el-tag>
                </div>
              </div>
              <p>{{ address.fullAddress }}</p>
            </button>
          </div>
          <el-empty v-else description="暂无收货地址，请先新增地址" />
        </div>

        <div class="checkout-block">
          <div class="store-subhead">
            <h3>商品清单</h3>
          </div>
          <div v-if="preview.invalidItems?.length" class="notice">存在不可下单商品，请返回购物车处理后再提交订单。</div>
          <div class="checkout-item-list">
            <div v-for="item in preview.items" :key="item.productId" class="checkout-item-row">
              <div>
                <strong>{{ item.name }}</strong>
                <p class="muted-text">数量 {{ item.quantity }}</p>
              </div>
              <div>￥{{ Number(item.currentPrice).toFixed(2) }}</div>
              <div>￥{{ (Number(item.currentPrice) * Number(item.quantity)).toFixed(2) }}</div>
            </div>
          </div>
        </div>

        <div class="checkout-block">
          <div class="stack-form">
            <span>订单备注</span>
            <el-input v-model="remark" type="textarea" :rows="3" placeholder="选填" />
          </div>
        </div>
      </div>

      <aside class="checkout-side-card">
        <h3>应付金额</h3>
        <div class="summary-kv">
          <span>商品合计</span>
          <strong class="price-text">￥{{ Number(preview.totalAmount || 0).toFixed(2) }}</strong>
        </div>
        <div class="summary-kv">
          <span>收货地址</span>
          <strong>{{ selectedAddressSummary }}</strong>
        </div>
        <el-button class="cart-submit-btn" type="primary" :loading="submitting" @click="submitOrder">
          {{ submitting ? '提交中...' : '提交订单' }}
        </el-button>
      </aside>
    </div>
    <div v-if="message" class="notice">{{ message }}</div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import http from '../api/http';

const router = useRouter();
const addresses = ref([]);
const preview = ref({ items: [], invalidItems: [], totalAmount: 0 });
const selectedAddressId = ref('');
const remark = ref('');
const submitting = ref(false);
const message = ref('');

function normalizeAddress(address) {
  const receiverName = address.receiverName || address.receiver_name || '未填写收货人';
  const receiverPhone = address.receiverPhone || address.receiver_phone || '未填写手机号';
  const province = address.province || '';
  const city = address.city || '';
  const district = address.district || '';
  const detailAddress = address.detailAddress || address.detail_address || '';
  const fullAddress = [province, city, district, detailAddress].filter(Boolean).join(' ') || '未填写详细地址';
  return {
    id: address.id,
    receiverName,
    receiverPhone,
    province,
    city,
    district,
    detailAddress,
    fullAddress,
    isDefault: Boolean(address.isDefault ?? Number(address.is_default) === 1)
  };
}

const normalizedAddresses = computed(() => addresses.value.map(normalizeAddress));
const selectedAddress = computed(() => normalizedAddresses.value.find((item) => Number(item.id) === Number(selectedAddressId.value)));
const selectedAddressSummary = computed(() => {
  if (!selectedAddress.value) {
    return '未选择';
  }
  return `${selectedAddress.value.receiverName} ${selectedAddress.value.fullAddress}`;
});

async function loadData() {
  try {
    const [previewResponse, addressResponse] = await Promise.all([http.get('/orders/preview'), http.get('/users/addresses')]);
    preview.value = previewResponse.data;
    addresses.value = addressResponse.data;
    const defaultAddress = normalizedAddresses.value.find((item) => item.isDefault);
    selectedAddressId.value = defaultAddress?.id || normalizedAddresses.value[0]?.id || '';
  } catch (error) {
    message.value = error.message;
  }
}

async function submitOrder() {
  if (!selectedAddressId.value) {
    message.value = '请先选择收货地址';
    return;
  }
  submitting.value = true;
  message.value = '';
  try {
    const response = await http.post('/orders', {
      addressId: selectedAddressId.value,
      remark: remark.value
    });
    router.push(`/pay/${response.data.orderNo}`);
  } catch (error) {
    message.value = error.message;
  } finally {
    submitting.value = false;
  }
}

onMounted(loadData);
</script>
