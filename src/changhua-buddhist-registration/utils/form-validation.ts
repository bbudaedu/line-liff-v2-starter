// 表單資料類型定義
export interface PersonalInfoFormData {
  // 共同欄位
  name: string;
  idNumber: string;
  birthDate: string;
  phone: string;
  specialRequirements?: string;
  
  // 法師專用欄位
  dharmaName?: string;
  templeName?: string;
}

// 表單驗證錯誤類型
export interface PersonalInfoErrors {
  name?: string;
  idNumber?: string;
  birthDate?: string;
  phone?: string;
  specialRequirements?: string;
  dharmaName?: string;
  templeName?: string;
}

// 身分證字號驗證
export function validateIdNumber(idNumber: string): boolean {
  if (!idNumber || idNumber.length !== 10) {
    return false;
  }

  // 身分證字號格式：第一碼為英文字母，後九碼為數字
  const pattern = /^[A-Z][0-9]{9}$/;
  return pattern.test(idNumber);
}

// 電話號碼驗證
export function validatePhoneNumber(phone: string): boolean {
  if (!phone) {
    return false;
  }

  // 移除所有非數字字符
  const cleanPhone = phone.replace(/\D/g, '');
  
  // 台灣手機號碼格式：09xxxxxxxx (10碼)
  if (cleanPhone.length === 10 && cleanPhone.startsWith('09')) {
    return true;
  }

  // 台灣市話格式：0x-xxxxxxx 或 0x-xxxxxxxx (9-10碼，不含區碼分隔符)
  if ((cleanPhone.length === 9 || cleanPhone.length === 10) && 
      cleanPhone.startsWith('0') && 
      !cleanPhone.startsWith('09')) {
    return true;
  }

  return false;
}

// 出生日期驗證
export function validateBirthDate(birthDate: string): boolean {
  if (!birthDate) {
    return false;
  }

  const date = new Date(birthDate);
  const now = new Date();
  
  // 檢查日期格式是否有效
  if (isNaN(date.getTime())) {
    return false;
  }

  // 檢查日期是否在合理範圍內（18-120歲）
  const age = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  const dayDiff = now.getDate() - date.getDate();
  
  let actualAge = age;
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    actualAge--;
  }

  return actualAge >= 18 && actualAge <= 120;
}

// 姓名驗證
export function validateName(name: string): boolean {
  if (!name || name.trim().length === 0) {
    return false;
  }

  // 姓名長度應在2-20字之間
  const trimmedName = name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 20) {
    return false;
  }

  // 姓名應只包含中文、英文字母和空格
  const namePattern = /^[\u4e00-\u9fa5a-zA-Z\s]+$/;
  return namePattern.test(trimmedName);
}

// 法名驗證
export function validateDharmaName(dharmaName: string): boolean {
  if (!dharmaName || dharmaName.trim().length === 0) {
    return false;
  }

  // 法名長度應在1-10字之間
  const trimmedName = dharmaName.trim();
  if (trimmedName.length < 1 || trimmedName.length > 10) {
    return false;
  }

  // 法名通常只包含中文字符
  const dharmaNamePattern = /^[\u4e00-\u9fa5]+$/;
  return dharmaNamePattern.test(trimmedName);
}

// 道場名稱驗證
export function validateTempleName(templeName: string): boolean {
  if (!templeName || templeName.trim().length === 0) {
    return false;
  }

  // 道場名稱長度應在2-30字之間
  const trimmedName = templeName.trim();
  if (trimmedName.length < 2 || trimmedName.length > 30) {
    return false;
  }

  // 道場名稱可包含中文、英文、數字和常見符號
  const templeNamePattern = /^[\u4e00-\u9fa5a-zA-Z0-9\s\-\(\)（）]+$/;
  return templeNamePattern.test(trimmedName);
}

// 特殊需求驗證
export function validateSpecialRequirements(requirements?: string): boolean {
  if (!requirements) {
    return true; // 特殊需求為選填
  }

  // 特殊需求長度不應超過500字
  const trimmed = requirements.trim();
  return trimmed.length <= 500;
}

// 完整表單驗證
export function validatePersonalInfo(
  data: Partial<PersonalInfoFormData>, 
  identity: 'monk' | 'volunteer'
): PersonalInfoErrors {
  const errors: PersonalInfoErrors = {};

  // 驗證姓名
  if (!validateName(data.name || '')) {
    if (!data.name || data.name.trim().length === 0) {
      errors.name = identity === 'monk' ? '請輸入俗名' : '請輸入姓名';
    } else if (data.name.trim().length < 2) {
      errors.name = '姓名至少需要2個字';
    } else if (data.name.trim().length > 20) {
      errors.name = '姓名不能超過20個字';
    } else {
      errors.name = '姓名格式不正確，請使用中文或英文';
    }
  }

  // 法師專用欄位驗證
  if (identity === 'monk') {
    // 驗證法名
    if (!validateDharmaName(data.dharmaName || '')) {
      if (!data.dharmaName || data.dharmaName.trim().length === 0) {
        errors.dharmaName = '請輸入法名';
      } else if (data.dharmaName.trim().length < 1) {
        errors.dharmaName = '法名不能為空';
      } else if (data.dharmaName.trim().length > 10) {
        errors.dharmaName = '法名不能超過10個字';
      } else {
        errors.dharmaName = '法名格式不正確，請使用中文';
      }
    }

    // 驗證道場名稱
    if (!validateTempleName(data.templeName || '')) {
      if (!data.templeName || data.templeName.trim().length === 0) {
        errors.templeName = '請輸入道場名稱';
      } else if (data.templeName.trim().length < 2) {
        errors.templeName = '道場名稱至少需要2個字';
      } else if (data.templeName.trim().length > 30) {
        errors.templeName = '道場名稱不能超過30個字';
      } else {
        errors.templeName = '道場名稱格式不正確';
      }
    }
  }

  // 驗證身分證字號
  if (!validateIdNumber(data.idNumber || '')) {
    if (!data.idNumber || data.idNumber.trim().length === 0) {
      errors.idNumber = '請輸入身分證字號';
    } else if (data.idNumber.length !== 10) {
      errors.idNumber = '身分證字號必須為10碼';
    } else if (!/^[A-Z][0-9]{9}$/.test(data.idNumber)) {
      errors.idNumber = '身分證字號格式不正確';
    } else {
      errors.idNumber = '身分證字號檢查碼錯誤';
    }
  }

  // 驗證出生日期
  if (!validateBirthDate(data.birthDate || '')) {
    if (!data.birthDate) {
      errors.birthDate = '請選擇出生日期';
    } else {
      const date = new Date(data.birthDate);
      if (isNaN(date.getTime())) {
        errors.birthDate = '出生日期格式不正確';
      } else {
        const age = new Date().getFullYear() - date.getFullYear();
        if (age < 18) {
          errors.birthDate = '年齡必須滿18歲';
        } else if (age > 120) {
          errors.birthDate = '請輸入正確的出生日期';
        }
      }
    }
  }

  // 驗證電話號碼
  if (!validatePhoneNumber(data.phone || '')) {
    if (!data.phone || data.phone.trim().length === 0) {
      errors.phone = '請輸入聯絡電話';
    } else {
      errors.phone = '電話號碼格式不正確';
    }
  }

  // 驗證特殊需求
  if (!validateSpecialRequirements(data.specialRequirements)) {
    errors.specialRequirements = '特殊需求說明不能超過500字';
  }

  return errors;
}

// 格式化電話號碼顯示
export function formatPhoneNumber(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length === 10 && cleanPhone.startsWith('09')) {
    // 手機號碼格式：0912-345-678
    return `${cleanPhone.slice(0, 4)}-${cleanPhone.slice(4, 7)}-${cleanPhone.slice(7)}`;
  } else if (cleanPhone.length === 10 && cleanPhone.startsWith('02')) {
    // 台北市話格式：02-1234-5678
    return `${cleanPhone.slice(0, 2)}-${cleanPhone.slice(2, 6)}-${cleanPhone.slice(6)}`;
  } else if (cleanPhone.length === 9 && cleanPhone.startsWith('0')) {
    // 其他市話格式：04-123-4567
    return `${cleanPhone.slice(0, 2)}-${cleanPhone.slice(2, 5)}-${cleanPhone.slice(5)}`;
  }
  
  return phone; // 如果格式不符合，返回原始輸入
}

// 格式化身分證字號顯示（隱藏部分數字）
export function formatIdNumberForDisplay(idNumber: string): string {
  if (idNumber.length !== 10) {
    return idNumber;
  }
  
  // 顯示格式：A123***789
  return `${idNumber.slice(0, 4)}***${idNumber.slice(7)}`;
}

// 檢查表單是否完整填寫
export function isFormComplete(data: PersonalInfoFormData, identity: 'monk' | 'volunteer'): boolean {
  const errors = validatePersonalInfo(data, identity);
  return Object.keys(errors).length === 0;
}

// 獲取表單完成度百分比
export function getFormCompletionPercentage(data: PersonalInfoFormData, identity: 'monk' | 'volunteer'): number {
  const requiredFields = identity === 'monk' 
    ? ['name', 'dharmaName', 'templeName', 'idNumber', 'birthDate', 'phone']
    : ['name', 'idNumber', 'birthDate', 'phone'];
  
  const filledFields = requiredFields.filter(field => {
    const value = data[field as keyof PersonalInfoFormData];
    return value && value.toString().trim().length > 0;
  });
  
  return Math.round((filledFields.length / requiredFields.length) * 100);
}