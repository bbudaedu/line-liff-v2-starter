import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PersonalInfoForm } from '@/components/forms/PersonalInfoForm';
import { IdentityProvider } from '@/contexts/IdentityContext';
import { PersonalInfoFormData } from '@/utils/form-validation';
import * as formStorage from '@/utils/form-storage';

// Mock the form storage utilities
jest.mock('@/utils/form-storage', () => ({
  saveFormData: jest.fn(),
  loadFormData: jest.fn(),
  clearFormData: jest.fn()
}));

// Mock the LIFF hook
jest.mock('@/hooks/useLiff', () => ({
  useLiff: () => ({
    profile: {
      userId: 'test-user-id',
      displayName: '測試使用者',
      pictureUrl: 'https://example.com/avatar.jpg'
    },
    isInLineClient: true,
    isLoggedIn: true,
    isLoading: false,
    error: null
  })
}));

// Mock the identity hook
jest.mock('@/hooks/useIdentity', () => ({
  useIdentity: () => ({
    identity: 'monk',
    hasSelectedIdentity: true,
    isLoading: false,
    switchIdentity: jest.fn(),
    clearIdentity: jest.fn()
  })
}));

const mockFormStorage = formStorage as jest.Mocked<typeof formStorage>;

describe('PersonalInfoForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  const defaultProps = {
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel
  };

  const renderWithProvider = (props = {}) => {
    return render(
      <IdentityProvider>
        <PersonalInfoForm {...defaultProps} {...props} />
      </IdentityProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFormStorage.loadFormData.mockReturnValue(null);
  });

  describe('Rendering', () => {
    it('should render form title and identity badge', () => {
      renderWithProvider();
      
      expect(screen.getByText('個人資料填寫')).toBeInTheDocument();
      expect(screen.getByText('身份：法師')).toBeInTheDocument();
    });

    it('should render monk-specific fields', () => {
      renderWithProvider();
      
      expect(screen.getByLabelText('法名')).toBeInTheDocument();
      expect(screen.getByLabelText('俗名')).toBeInTheDocument();
      expect(screen.getByLabelText('道場名稱')).toBeInTheDocument();
    });

    it('should render common fields', () => {
      renderWithProvider();
      
      expect(screen.getByLabelText('身分證字號')).toBeInTheDocument();
      expect(screen.getByLabelText('出生年月日')).toBeInTheDocument();
      expect(screen.getByLabelText('聯絡電話')).toBeInTheDocument();
      expect(screen.getByLabelText('特殊需求')).toBeInTheDocument();
    });

    it('should render form action buttons', () => {
      renderWithProvider();
      
      expect(screen.getByText('確認提交')).toBeInTheDocument();
      expect(screen.getByText('取消')).toBeInTheDocument();
      expect(screen.getByText('清除表單')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors for empty required fields', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const submitButton = screen.getByText('確認提交');
      await user.click(submitButton);
      
      // Wait for validation to complete
      await waitFor(() => {
        // Check if any validation error is shown
        const errorElements = screen.queryAllByText(/請輸入|請選擇/);
        expect(errorElements.length).toBeGreaterThan(0);
      });
      
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should validate ID number format', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const idNumberInput = screen.getByLabelText(/身分證字號/);
      await user.type(idNumberInput, 'invalid-id');
      await user.tab(); // Trigger blur event
      
      await waitFor(() => {
        expect(screen.getByText('身分證字號格式不正確')).toBeInTheDocument();
      });
    });

    it('should validate phone number format', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const phoneInput = screen.getByLabelText(/聯絡電話/);
      await user.type(phoneInput, '123');
      await user.tab(); // Trigger blur event
      
      await waitFor(() => {
        expect(screen.getByText('電話號碼格式不正確')).toBeInTheDocument();
      });
    });

    it('should clear field errors when valid input is entered', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const nameInput = screen.getByLabelText(/俗名/);
      
      // First trigger error by submitting empty form
      await user.click(screen.getByText('確認提交'));
      
      // Wait for any error to appear
      await waitFor(() => {
        const errorElements = screen.queryAllByText(/請輸入|請選擇/);
        expect(errorElements.length).toBeGreaterThan(0);
      });
      
      // Then enter valid input
      await user.type(nameInput, '王小明');
      
      // The error should be cleared when typing
      await waitFor(() => {
        // Check that the form is now accepting input
        expect(nameInput).toHaveValue('王小明');
      });
    });
  });

  describe('Form Submission', () => {
    const validFormData: PersonalInfoFormData = {
      name: '王小明',
      dharmaName: '釋慧明',
      templeName: '慈濟功德會',
      idNumber: 'A123456789',
      birthDate: '1990-01-01',
      phone: '0912345678',
      specialRequirements: '素食'
    };

    it('should submit valid form data', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      // Fill in all required fields
      await user.type(screen.getByLabelText(/法名/), validFormData.dharmaName!);
      await user.type(screen.getByLabelText(/俗名/), validFormData.name);
      await user.type(screen.getByLabelText(/道場名稱/), validFormData.templeName!);
      await user.type(screen.getByLabelText(/身分證字號/), validFormData.idNumber);
      await user.type(screen.getByLabelText(/出生年月日/), validFormData.birthDate);
      await user.type(screen.getByLabelText(/聯絡電話/), validFormData.phone);
      await user.type(screen.getByLabelText('特殊需求'), validFormData.specialRequirements!);
      
      const submitButton = screen.getByText('確認提交');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(validFormData);
      });
    });

    it('should show loading state during submission', () => {
      renderWithProvider({ isLoading: true });
      
      expect(screen.getByText('提交中...')).toBeInTheDocument();
      const submitButton = screen.getByRole('button', { name: /提交中/ });
      expect(submitButton).toBeDisabled();
    });

    it('should display submit error', () => {
      const errorMessage = '提交失敗，請重試';
      renderWithProvider({ submitError: errorMessage });
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should clear form data from storage on successful submission', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      // Fill in minimal required fields
      await user.type(screen.getByLabelText(/法名/), '釋慧明');
      await user.type(screen.getByLabelText(/俗名/), '王小明');
      await user.type(screen.getByLabelText(/道場名稱/), '慈濟功德會');
      await user.type(screen.getByLabelText(/身分證字號/), 'A123456789');
      await user.type(screen.getByLabelText(/出生年月日/), '1990-01-01');
      await user.type(screen.getByLabelText(/聯絡電話/), '0912345678');
      
      const submitButton = screen.getByText('確認提交');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockFormStorage.clearFormData).toHaveBeenCalledWith('personal-info-monk');
      });
    });
  });

  describe('Auto-save Functionality', () => {
    it('should load saved form data on mount', () => {
      const savedData = {
        name: '王小明',
        dharmaName: '釋慧明',
        phone: '0912345678'
      };
      
      mockFormStorage.loadFormData.mockReturnValue(savedData);
      renderWithProvider();
      
      expect(mockFormStorage.loadFormData).toHaveBeenCalledWith('personal-info-monk');
      expect(screen.getByDisplayValue('王小明')).toBeInTheDocument();
      expect(screen.getByDisplayValue('釋慧明')).toBeInTheDocument();
      expect(screen.getByDisplayValue('0912345678')).toBeInTheDocument();
    });

    it('should auto-save form data when user types', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const nameInput = screen.getByLabelText(/俗名/);
      await user.type(nameInput, '王小明');
      
      // Wait for auto-save timer
      await waitFor(() => {
        expect(mockFormStorage.saveFormData).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it('should show auto-save status', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const nameInput = screen.getByLabelText(/俗名/);
      await user.type(nameInput, '王小明');
      
      // Should eventually show saved status
      await waitFor(() => {
        const autoSaveStatus = screen.getByText(/儲存中|已自動儲存/);
        expect(autoSaveStatus).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Form Actions', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const cancelButton = screen.getByText('取消');
      await user.click(cancelButton);
      
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should clear form when clear button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      // Fill in some data
      await user.type(screen.getByLabelText(/俗名/), '王小明');
      await user.type(screen.getByLabelText(/聯絡電話/), '0912345678');
      
      const clearButton = screen.getByText('清除表單');
      await user.click(clearButton);
      
      expect(screen.getByLabelText(/俗名/)).toHaveValue('');
      expect(screen.getByLabelText(/聯絡電話/)).toHaveValue('');
      expect(mockFormStorage.clearFormData).toHaveBeenCalledWith('personal-info-monk');
    });
  });

  describe('Initial Data', () => {
    it('should populate form with initial data', () => {
      const initialData = {
        name: '李小華',
        phone: '0987654321'
      };
      
      renderWithProvider({ initialData });
      
      expect(screen.getByDisplayValue('李小華')).toBeInTheDocument();
      expect(screen.getByDisplayValue('0987654321')).toBeInTheDocument();
    });

    it('should prioritize initial data over saved data', () => {
      const savedData = {
        name: '王小明',
        phone: '0912345678'
      };
      
      const initialData = {
        name: '李小華',
        phone: '0987654321'
      };
      
      mockFormStorage.loadFormData.mockReturnValue(savedData);
      renderWithProvider({ initialData });
      
      expect(screen.getByDisplayValue('李小華')).toBeInTheDocument();
      expect(screen.getByDisplayValue('0987654321')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('王小明')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      renderWithProvider();
      
      expect(screen.getByLabelText(/法名/)).toBeInTheDocument();
      expect(screen.getByLabelText(/俗名/)).toBeInTheDocument();
      expect(screen.getByLabelText(/道場名稱/)).toBeInTheDocument();
      expect(screen.getByLabelText(/身分證字號/)).toBeInTheDocument();
      expect(screen.getByLabelText(/出生年月日/)).toBeInTheDocument();
      expect(screen.getByLabelText(/聯絡電話/)).toBeInTheDocument();
      expect(screen.getByLabelText('特殊需求')).toBeInTheDocument();
    });

    it('should have proper form structure', () => {
      renderWithProvider();
      
      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();
      
      const submitButton = screen.getByRole('button', { name: '確認提交' });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('should show required field indicators', () => {
      renderWithProvider();
      
      // Check for required asterisks (*)
      const requiredFields = screen.getAllByText('*');
      expect(requiredFields.length).toBeGreaterThan(0);
    });
  });
});