
# Dokumentasi API WaveApp

Dokumen ini menjelaskan cara menggunakan API WaveApp untuk berinteraksi dengan data inventaris, penjualan, dan pengiriman Anda dari aplikasi eksternal (misalnya, aplikasi Android, web lain, atau skrip).

## 1. Otentikasi

Setiap permintaan (request) ke API harus menyertakan sebuah *API Key* pada bagian *header* untuk otentikasi.

- **Header**: `X-API-Key`
- **Value**: `secret-api-key-for-waveapp`

**Penting:** Jaga kerahasiaan API Key ini. Di lingkungan produksi, Anda harus menggunakan *key* yang lebih kompleks dan menyimpannya dengan aman.

**Contoh Header:**
```
GET /api/products
Host: nama-domain-anda.com
X-API-Key: secret-api-key-for-waveapp
```

---

## 2. Base URL

Semua *endpoint* API diawali dengan `/api`. Jika aplikasi Anda di-hosting di `https://myapp.com`, maka *base URL* untuk API adalah `https://myapp.com/api`.

---

## 3. Pengembangan Lokal dari Perangkat Mobile (Android/iOS)

Saat menjalankan aplikasi ini di komputer lokal (misalnya, dengan `npm run dev`), `localhost` tidak dapat diakses langsung dari perangkat mobile Anda (seperti HP Android) yang berada di jaringan yang sama. Ikuti langkah-langkah ini untuk menghubungkannya:

1.  **Pastikan Terhubung ke Jaringan yang Sama**: Komputer dan perangkat mobile Anda harus terhubung ke jaringan Wi-Fi yang sama.

2.  **Temukan Alamat IP Komputer Anda**:
    *   **Di Windows**: Buka **Command Prompt** dan ketik `ipconfig`. Cari alamat "IPv4 Address" (contoh: `192.168.1.10`).
    *   **Di macOS/Linux**: Buka **Terminal** dan ketik `ifconfig` atau `ip a`. Cari alamat "inet" di bawah `en0` atau `wlan0` (contoh: `192.168.1.10`).

3.  **Gunakan Alamat IP di Aplikasi Mobile Anda**:
    Di kode aplikasi mobile Anda, ganti `localhost:1999` dengan alamat IP komputer Anda diikuti port `1999`.

    **Contoh:**
    Jika alamat IP komputer Anda adalah `192.168.1.10`, maka URL API Anda menjadi:
    `http://192.168.1.10:1999/api/products`

    *Catatan: Skrip `dev` di `package.json` sudah dikonfigurasi (`-H 0.0.0.0`) untuk menerima koneksi dari perangkat lain di jaringan Anda.*

---

## 4. Endpoint API

Berikut adalah daftar endpoint utama yang tersedia.

### Produk & Inventaris

#### **GET** `/api/products`
Mengambil semua data produk dan aksesoris.
- **Method**: `GET`
- **Contoh Respon**:
```json
{
  "products": [
    {
      "id": 1,
      "name": "T-Shirt Boxy Hitam",
      "category": "T-Shirt Boxy",
      "sku": "TSH-BOXY-BLK",
      "hasVariants": true,
      "variants": [
        {
          "id": 1,
          "productId": 1,
          "name": "L",
          "sku": "TSH-BOXY-BLK-L",
          "price": 120000,
          "stock": 50,
          "costPrice": 60000
        }
      ],
      // ...properti lainnya
    }
  ],
  "accessories": [
    {
      "id": 1,
      "name": "Hangtag Waveblast",
      "sku": "ACC-HT-01",
      "stock": 1000,
      // ...properti lainnya
    }
  ]
}
```

#### **POST** `/api/products`
Menambahkan produk baru (baik produk simpel maupun dengan varian).
- **Method**: `POST`
- **Body (Produk Simpel)**:
```json
{
  "name": "Topi Baseball",
  "category": "Caps",
  "sku": "CAP-BB-01",
  "hasVariants": false,
  "price": 85000,
  "stock": 150,
  "costPrice": 40000
}
```
- **Body (Produk dengan Varian)**:
```json
{
  "name": "Hoodie Polos",
  "category": "Hoodie",
  "sku": "HD-PLN",
  "hasVariants": true,
  "variants": [
    { "name": "M", "sku": "HD-PLN-M", "price": 250000, "stock": 30, "costPrice": 120000 },
    { "name": "L", "sku": "HD-PLN-L", "price": 250000, "stock": 50, "costPrice": 120000 }
  ]
}
```

#### **POST** `/api/products/{id}/stock`
Menyesuaikan jumlah stok untuk produk atau varian tertentu.
- **Method**: `POST`
- **URL**: `/api/products/123/stock` (di mana `123` adalah ID produk atau varian)
- **Body**:
```json
{
  "change": 10,  // Gunakan nilai positif untuk stok masuk, negatif untuk stok keluar
  "reason": "Stok opname"
}
```

---

### Penjualan (Sales)

#### **POST** `/api/sales`
Mencatat transaksi penjualan baru, biasanya untuk POS atau Reseller.
- **Method**: `POST`
- **Body**:
```json
{
  "sales": [
    { "sku": "TSH-BOXY-BLK-L", "quantity": 2, "price": 120000 },
    { "sku": "CAP-BB-01", "quantity": 1, "price": 85000 }
  ],
  "options": {
    "channel": "pos", // atau "reseller"
    "paymentMethod": "Cash", // "Qris", "Debit", "Transfer"
    "resellerName": "Nama Reseller" // Opsional, jika channel adalah reseller
  }
}
```

#### **POST** `/api/sales/online`
Mencatat penjualan dari kanal online (Shopee, Tiktok, dll.) yang terikat pada sebuah resi pengiriman.
- **Method**: `POST`
- **Body**:
```json
{
  "receipt": {
    "awb": "SPX123456789",
    "salesChannel": "Shopee",
    "channel": "SPX"
  },
  "sales": [
    {
      "sku": "TSH-BOXY-BLK-L",
      "quantity": 1,
      "priceAtSale": 115000
    }
  ]
}
```
- **Penting**: Endpoint ini akan otomatis mengurangi stok dan membuat/memperbarui data `shipping_receipts`.

---

### Pengiriman (Shipping)

#### **GET** `/api/shipping/receipts`
Mengambil daftar resi pengiriman dengan filter.
- **Method**: `GET`
- **Query Params (Opsional)**:
  - `page`: Nomor halaman (default: 1)
  - `limit`: Jumlah item per halaman (default: 50)
  - `salesChannel`: `Shopee`, `Tiktok`, `Lazada`
  - `channel`: `SPX`, `J&T`, `JNE`, dll.
  - `status`: `Terproses`, `Siap Kirim`, dll.
  - `date`: Tanggal dalam format `YYYY-MM-DD`
  - `awb`: Nomor resi untuk pencarian
- **Contoh URL**: `/api/shipping/receipts?status=Terproses&salesChannel=Shopee&date=2024-05-20`

#### **POST** `/api/shipping/scan`
Memproses resi yang siap untuk dikirim (mengubah status dari 'Terproses' menjadi 'Siap Kirim').
- **Method**: `POST`
- **Body**:
```json
{
  "awb": "SPX987654321",
  "channel": "SPX" // Jasa kirim yang sesuai
}
```
- **Respon Sukses**:
```json
{
  "message": "Berhasil diubah menjadi \"Siap Kirim\".",
  "receipt": {
    "id": 1,
    "awb": "SPX987654321",
    "status": "Siap Kirim",
    // ...properti lainnya
  }
}
```

Semoga dokumentasi ini membantu pengembangan aplikasi Anda selanjutnya!
