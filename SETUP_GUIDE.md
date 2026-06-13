# EasyACC Desktop Installation & Setup Guide | ডেক্সটপ ইনস্টলেশন ও সেটআপ গাইড

This guide explains how to install and configure the EasyACC desktop billing application from the setup `.exe` file.
এই গাইডটি কিভাবে সেটআপ `.exe` ফাইল থেকে EasyACC ডেক্সটপ বিলিং অ্যাপ্লিকেশন ইনস্টল এবং কনফিগার করবেন তা ব্যাখ্যা করে।

---

## 📋 Prerequisites / প্রয়োজনীয়তা

| English | বাংলা |
| :--- | :--- |
| **System:** Windows 10 or Windows 11 (64-bit). | **সিস্টেম:** উইন্ডোজ ১০ বা উইন্ডোজ ১১ (৬৪-বিট)। |
| **Privileges:** Administrator access (for initial installation and printer setup). | **অনুমতি:** অ্যাডমিনিস্ট্রেটর অ্যাক্সেস (প্রাথমিক ইনস্টলেশন এবং প্রিন্টার সেটআপের জন্য)। |
| **Hardware:** USB Thermal Receipt Printer (optional, for printing bills) & Barcode Scanner. | **হার্ডওয়্যার:** ইউএসবি থার্মাল রিসিপ্ট প্রিন্টার (ঐচ্ছিক, বিল প্রিন্ট করার জন্য) এবং বারকোড স্ক্যানার। |

---

## ⚙️ Step-by-Step Installation / ধাপে ধাপে ইনস্টলেশন প্রক্রিয়া

| Step (English) |  (বাংলা) |
| :--- | :--- |
| **Step 1: Locate the Installer**<br>Navigate to the project build folder `desktop-client/dist/` and locate the file named `easyacc-desktop Setup 1.0.0.exe`. | **ধাপ ১: ইনস্টলারটি খুঁজুন**<br>প্রোজেক্টের বিল্ড ফোল্ডার `desktop-client/dist/`-এ যান এবং `easyacc-desktop Setup 1.0.0.exe` নামের ফাইলটি খুঁজুন। |
| **Step 2: Run the Setup File**<br>Double-click the `.exe` file to start the installation. | **ধাপ ২: সেটআপ ফাইলটি রান করুন**<br>ইনস্টলেশন শুরু করতে `.exe` ফাইলটিতে ডাবল-ক্লিক করুন। |
| **Step 3: SmartScreen Warning (If shown)**<br>Since this is a custom local build (unsigned package), Windows SmartScreen might block it.<br>1. Click **"More Info"**.<br>2. Click **"Run anyway"**. | **ধাপ ৩: স্মার্টস্ক্রিন সতর্কতা (যদি দেখায়)**<br>যেহেতু এটি একটি কাস্টম লোকাল বিল্ড (স্বাক্ষরবিহীন প্যাকেজ), উইন্ডোজ স্মার্টস্ক্রিন এটি ব্লক করতে পারে।<br>১. **"More Info"**-এ ক্লিক করুন।<br>২. **"Run anyway"**-এ ক্লিক করুন। |
| **Step 4: Installation Complete**<br>The setup installer runs in one-click mode. It will install the application files, place a shortcut icon named **EasyACC** on your Desktop, and launch the application automatically. | **ধাপ ৪: ইনস্টলেশন সম্পন্ন**<br>সেটআপ ইনস্টলারটি ওয়ান-ক্লিক মোডে চলে। এটি অ্যাপের ফাইলগুলো ইনস্টল করবে, আপনার ডেক্সটপে **EasyACC** নামে একটি শর্টকাট আইকন তৈরি করবে এবং স্বয়ংক্রিয়ভাবে অ্যাপটি চালু করবে। |

---

## 📡 Configuring Cloud Sync / ক্লাউড সিঙ্ক কনফিগারেশন

| English | বাংলা |
| :--- | :--- |
| By default, the application runs entirely offline. To connect it to your hosted VPS cloud backend:<br><br>1. Set your backend domain or VPS IP address in the environment settings.<br>2. When internet connectivity is active, local sales invoice data will automatically synchronize to your cloud MongoDB server. | ডিফল্টরূপে, অ্যাপ্লিকেশনটি সম্পূর্ণ অফলাইনে চলে। আপনার হোস্টেড ভিপিএস (VPS) ক্লাউড ব্যাকএন্ডের সাথে এটিকে সংযুক্ত করতে:<br><br>১. এনভায়রনমেন্ট সেটিংসে আপনার ব্যাকএন্ড ডোমেন বা ভিপিএস আইপি অ্যাড্রেস সেট করুন।<br>২. ইন্টারনেট সংযোগ চালু হলে, স্থানীয় বিক্রয় চালানের ডেটা স্বয়ংক্রিয়ভাবে আপনার ক্লাউড MongoDB সার্ভারে সিঙ্ক হবে। |

---

## 🖨️ Thermal Printer & Scanner Config / থার্মাল প্রিন্টার ও স্ক্যানার কনফিগারেশন

| English | বাংলা |
| :--- | :--- |
| **Barcode Scanner:** Any standard USB barcode scanner works plug-and-play. Connect the scanner to a USB port, click on the POS search bar, and scan a barcode.<br><br>**Thermal Receipt Printer:** Connect your printer via USB. Ensure the printer driver is installed in Windows, and set it as the default printer to enable one-click silent receipt printing. | **বারকোড স্ক্যানার:** যেকোনো স্ট্যান্ডার্ড ইউএসবি বারকোড স্ক্যানার প্লাগ-অ্যান্ড-প্লে হিসেবে কাজ করে। স্ক্যানারটি ইউএসবি পোর্টে কানেক্ট করুন, পিওএস সার্চ বারে ক্লিক করুন এবং বারকোড স্ক্যান করুন।<br><br>**থার্মাল রিসিপ্ট প্রিন্টার:** ইউএসবি-র মাধ্যমে আপনার প্রিন্টার কানেক্ট করুন। উইন্ডোজে প্রিন্টার ড্রাইভার ইনস্টল করা আছে তা নিশ্চিত করুন, এবং ওয়ান-ক্লিক সাইলেন্ট প্রিন্ট সক্রিয় করতে এটিকে ডিফল্ট প্রিন্টার হিসেবে সেট করুন। |
