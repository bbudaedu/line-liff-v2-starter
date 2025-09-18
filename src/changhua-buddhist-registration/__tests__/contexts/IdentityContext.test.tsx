import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { 
  IdentityProvider, 
  useIdentityContext, 
  withIdentityRequired,
  IdentityGuard,
  IdentitySpecific,
  IdentitySwitcher
} from '@/contexts/IdentityContext';
import { USER_IDENTITY } from '@/utils/constants';

// Mock storage helper
jest.mock('@/utils/helpers', () => ({
  storage: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
  },
}));

// Mock window.location
delete (window as any).location;
(window as any).location = { href: '' };

// Test component that uses the context
function TestComponent() {
  const { 
    identity, 
    hasSelectedIdentity, 
    isLoading, 
    setIdentity, 
    clearIdentity,
    getIdentityDisplayName,
    isMonk,
    isVolunteer
  } = useIdentityContext();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div data-testid="identity">{identity || 'none'}</div>
      <div data-testid="hasSelected">{hasSelectedIdentity.toString()}</div>
      <div data-testid="displayName">{getIdentityDisplayName()}</div>
      <div data-testid="isMonk">{isMonk.toString()}</div>
      <div data-testid="isVolunteer">{isVolunteer.toString()}</div>
      <button onClick={() => setIdentity(USER_IDENTITY.MONK)}>Set Monk</button>
      <button onClick={() => setIdentity(USER_IDENTITY.VOLUNTEER)}>Set Volunteer</button>
      <button onClick={clearIdentity}>Clear Identity</button>
    </div>
  );
}

describe('IdentityContext', () => {
  const mockStorage = require('@/utils/helpers').storage;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.get.mockReturnValue(null);
  });

  describe('IdentityProvider', () => {
    it('should provide identity context to children', async () => {
      render(
        <IdentityProvider>
          <TestComponent />
        </IdentityProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText('初始化身份系統...')).not.toBeInTheDocument();
      });

      expect(screen.getByTestId('identity')).toHaveTextContent('none');
      expect(screen.getByTestId('hasSelected')).toHaveTextContent('false');
      expect(screen.getByTestId('displayName')).toHaveTextContent('未選擇');
      expect(screen.getByTestId('isMonk')).toHaveTextContent('false');
      expect(screen.getByTestId('isVolunteer')).toHaveTextContent('false');
    });

    it('should show loading state during initialization', () => {
      render(
        <IdentityProvider>
          <TestComponent />
        </IdentityProvider>
      );

      expect(screen.getByText('初始化身份系統...')).toBeInTheDocument();
    });

    it('should load existing identity from storage', async () => {
      mockStorage.get
        .mockReturnValueOnce(USER_IDENTITY.MONK)
        .mockReturnValueOnce(true);

      render(
        <IdentityProvider>
          <TestComponent />
        </IdentityProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('identity')).toHaveTextContent(USER_IDENTITY.MONK);
      });

      expect(screen.getByTestId('hasSelected')).toHaveTextContent('true');
      expect(screen.getByTestId('displayName')).toHaveTextContent('法師');
      expect(screen.getByTestId('isMonk')).toHaveTextContent('true');
      expect(screen.getByTestId('isVolunteer')).toHaveTextContent('false');
    });

    it('should handle identity changes', async () => {
      render(
        <IdentityProvider>
          <TestComponent />
        </IdentityProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('identity')).toHaveTextContent('none');
      });

      // 設定法師身份
      fireEvent.click(screen.getByText('Set Monk'));

      await waitFor(() => {
        expect(screen.getByTestId('identity')).toHaveTextContent(USER_IDENTITY.MONK);
      });

      expect(screen.getByTestId('hasSelected')).toHaveTextContent('true');
      expect(screen.getByTestId('isMonk')).toHaveTextContent('true');

      // 切換到志工身份
      fireEvent.click(screen.getByText('Set Volunteer'));

      await waitFor(() => {
        expect(screen.getByTestId('identity')).toHaveTextContent(USER_IDENTITY.VOLUNTEER);
      });

      expect(screen.getByTestId('isMonk')).toHaveTextContent('false');
      expect(screen.getByTestId('isVolunteer')).toHaveTextContent('true');

      // 清除身份
      fireEvent.click(screen.getByText('Clear Identity'));

      await waitFor(() => {
        expect(screen.getByTestId('identity')).toHaveTextContent('none');
      });

      expect(screen.getByTestId('hasSelected')).toHaveTextContent('false');
    });
  });

  describe('useIdentityContext', () => {
    it('should throw error when used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useIdentityContext must be used within an IdentityProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('withIdentityRequired HOC', () => {
    const MockComponent = () => <div>Protected Content</div>;
    const ProtectedComponent = withIdentityRequired(MockComponent);

    it('should render component when identity is selected', async () => {
      mockStorage.get
        .mockReturnValueOnce(USER_IDENTITY.MONK)
        .mockReturnValueOnce(true);

      render(
        <IdentityProvider>
          <ProtectedComponent />
        </IdentityProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    it('should redirect when no identity is selected', async () => {
      render(
        <IdentityProvider>
          <ProtectedComponent />
        </IdentityProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('需要選擇身份')).toBeInTheDocument();
      });

      expect(screen.getByText('正在跳轉到身份選擇頁面...')).toBeInTheDocument();
    });

    it('should show loading state during initialization', () => {
      render(
        <IdentityProvider>
          <ProtectedComponent />
        </IdentityProvider>
      );

      expect(screen.getByText('初始化身份系統...')).toBeInTheDocument();
    });
  });

  describe('IdentityGuard', () => {
    it('should render children when identity is selected', async () => {
      mockStorage.get
        .mockReturnValueOnce(USER_IDENTITY.VOLUNTEER)
        .mockReturnValueOnce(true);

      render(
        <IdentityProvider>
          <IdentityGuard>
            <div>Guarded Content</div>
          </IdentityGuard>
        </IdentityProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Guarded Content')).toBeInTheDocument();
      });
    });

    it('should show redirect message when no identity is selected', async () => {
      render(
        <IdentityProvider>
          <IdentityGuard>
            <div>Guarded Content</div>
          </IdentityGuard>
        </IdentityProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('需要選擇身份')).toBeInTheDocument();
      });

      expect(screen.queryByText('Guarded Content')).not.toBeInTheDocument();
    });

    it('should render custom fallback', async () => {
      render(
        <IdentityProvider>
          <IdentityGuard fallback={<div>Custom Fallback</div>}>
            <div>Guarded Content</div>
          </IdentityGuard>
        </IdentityProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Custom Fallback')).toBeInTheDocument();
      });

      expect(screen.queryByText('Guarded Content')).not.toBeInTheDocument();
    });
  });

  describe('IdentitySpecific', () => {
    it('should render content for matching identity', async () => {
      mockStorage.get
        .mockReturnValueOnce(USER_IDENTITY.MONK)
        .mockReturnValueOnce(true);

      render(
        <IdentityProvider>
          <IdentitySpecific identity={USER_IDENTITY.MONK}>
            <div>Monk Content</div>
          </IdentitySpecific>
        </IdentityProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Monk Content')).toBeInTheDocument();
      });
    });

    it('should not render content for non-matching identity', async () => {
      mockStorage.get
        .mockReturnValueOnce(USER_IDENTITY.VOLUNTEER)
        .mockReturnValueOnce(true);

      render(
        <IdentityProvider>
          <IdentitySpecific identity={USER_IDENTITY.MONK}>
            <div>Monk Content</div>
          </IdentitySpecific>
        </IdentityProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText('Monk Content')).not.toBeInTheDocument();
      });
    });

    it('should render fallback for non-matching identity', async () => {
      mockStorage.get
        .mockReturnValueOnce(USER_IDENTITY.VOLUNTEER)
        .mockReturnValueOnce(true);

      render(
        <IdentityProvider>
          <IdentitySpecific 
            identity={USER_IDENTITY.MONK}
            fallback={<div>Not Monk</div>}
          >
            <div>Monk Content</div>
          </IdentitySpecific>
        </IdentityProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Not Monk')).toBeInTheDocument();
      });

      expect(screen.queryByText('Monk Content')).not.toBeInTheDocument();
    });
  });

  describe('IdentitySwitcher', () => {
    it('should display current identity and allow switching', async () => {
      mockStorage.get
        .mockReturnValueOnce(USER_IDENTITY.MONK)
        .mockReturnValueOnce(true);

      const mockOnIdentityChanged = jest.fn();

      render(
        <IdentityProvider>
          <IdentitySwitcher onIdentityChanged={mockOnIdentityChanged} />
        </IdentityProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('目前身份：')).toBeInTheDocument();
        expect(screen.getByText('法師')).toBeInTheDocument();
      });

      const switchButton = screen.getByText('切換身份');
      fireEvent.click(switchButton);

      await waitFor(() => {
        expect(mockOnIdentityChanged).toHaveBeenCalledWith(USER_IDENTITY.VOLUNTEER);
      });
    });

    it('should not render when no identity is selected', async () => {
      render(
        <IdentityProvider>
          <IdentitySwitcher />
        </IdentityProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText('目前身份：')).not.toBeInTheDocument();
      });
    });

    it('should show loading state during switch', async () => {
      mockStorage.get
        .mockReturnValueOnce(USER_IDENTITY.VOLUNTEER)
        .mockReturnValueOnce(true);

      render(
        <IdentityProvider>
          <IdentitySwitcher />
        </IdentityProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('志工')).toBeInTheDocument();
      });

      const switchButton = screen.getByText('切換身份');
      fireEvent.click(switchButton);

      expect(screen.getByText('切換中...')).toBeInTheDocument();
    });
  });
});