<template>
  <section class="page-panel">
    <div class="section-head">
      <div>
        <h1>地址管理</h1>
      </div>
      <button class="btn btn-primary" type="button" @click="openCreateModal">新增地址</button>
    </div>

    <div class="address-grid">
      <article v-for="address in addresses" :key="address.id" class="address-card">
        <div class="summary-line">
          <strong>{{ address.receiverName }}</strong>
          <span v-if="address.isDefault" class="tag tag-success">默认地址</span>
        </div>
        <div>{{ address.receiverPhone }}</div>
        <div class="muted-text">
          {{ address.province }} {{ address.city }} {{ address.district }} {{ address.detailAddress }}
        </div>
        <div class="muted-text" v-if="address.postalCode">邮编：{{ address.postalCode }}</div>
        <div class="table-actions">
          <button class="text-button" type="button" @click="openEditModal(address)">编辑</button>
          <button class="text-button" type="button" @click="removeAddress(address.id)">删除</button>
        </div>
      </article>
      <div v-if="addresses.length === 0" class="empty-box">暂无地址，请先新增收货地址</div>
    </div>

    <div v-if="message" class="notice">{{ message }}</div>

    <BaseModal
      v-model="modalVisible"
      :title="form.id ? '编辑地址' : '新增地址'"
      description="下单时将优先展示默认地址。"
      size="medium"
    >
      <form class="stack-form" @submit.prevent="submitAddress">
        <label>
          <span>收货人</span>
          <input v-model.trim="form.receiverName" type="text" />
        </label>
        <label>
          <span>手机号</span>
          <input v-model.trim="form.receiverPhone" type="text" />
        </label>
        <div class="form-grid">
          <label>
            <span>省份</span>
            <input v-model.trim="form.province" type="text" />
          </label>
          <label>
            <span>城市</span>
            <input v-model.trim="form.city" type="text" />
          </label>
          <label>
            <span>区县</span>
            <input v-model.trim="form.district" type="text" />
          </label>
          <label>
            <span>邮编</span>
            <input v-model.trim="form.postalCode" type="text" />
          </label>
        </div>
        <label>
          <span>详细地址</span>
          <textarea v-model.trim="form.detailAddress" rows="3"></textarea>
        </label>
        <label class="checkbox-line">
          <input v-model="form.isDefault" type="checkbox" />
          <span>设为默认地址</span>
        </label>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit" :disabled="submitting">
            {{ submitting ? "保存中..." : "保存地址" }}
          </button>
          <button class="btn btn-light" type="button" @click="closeModal">取消</button>
        </div>
      </form>
    </BaseModal>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import http from "../api/http";
import BaseModal from "../components/BaseModal.vue";

const addresses = ref([]);
const message = ref("");
const submitting = ref(false);
const modalVisible = ref(false);
const form = reactive({
  id: "",
  receiverName: "",
  receiverPhone: "",
  province: "",
  city: "",
  district: "",
  detailAddress: "",
  postalCode: "",
  isDefault: false,
});

function resetForm() {
  form.id = "";
  form.receiverName = "";
  form.receiverPhone = "";
  form.province = "";
  form.city = "";
  form.district = "";
  form.detailAddress = "";
  form.postalCode = "";
  form.isDefault = false;
}

function closeModal() {
  resetForm();
  modalVisible.value = false;
}

function openCreateModal() {
  resetForm();
  modalVisible.value = true;
}

function openEditModal(address) {
  form.id = address.id;
  form.receiverName = address.receiverName;
  form.receiverPhone = address.receiverPhone;
  form.province = address.province;
  form.city = address.city;
  form.district = address.district;
  form.detailAddress = address.detailAddress;
  form.postalCode = address.postalCode;
  form.isDefault = address.isDefault;
  modalVisible.value = true;
}

async function loadAddresses() {
  try {
    const response = await http.get("/users/addresses");
    addresses.value = response.data;
  } catch (error) {
    message.value = error.message;
  }
}

async function submitAddress() {
  submitting.value = true;
  message.value = "";
  try {
    const payload = {
      receiverName: form.receiverName,
      receiverPhone: form.receiverPhone,
      province: form.province,
      city: form.city,
      district: form.district,
      detailAddress: form.detailAddress,
      postalCode: form.postalCode,
      isDefault: form.isDefault,
    };
    const response = form.id
      ? await http.put(`/users/addresses/${form.id}`, payload)
      : await http.post("/users/addresses", payload);
    message.value = response.message;
    closeModal();
    await loadAddresses();
  } catch (error) {
    message.value = error.message;
  } finally {
    submitting.value = false;
  }
}

async function removeAddress(addressId) {
  try {
    const response = await http.delete(`/users/addresses/${addressId}`);
    message.value = response.message;
    await loadAddresses();
  } catch (error) {
    message.value = error.message;
  }
}

onMounted(loadAddresses);
</script>
