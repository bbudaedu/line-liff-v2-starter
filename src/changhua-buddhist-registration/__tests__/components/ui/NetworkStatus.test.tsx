import React from 'react';
import { render, screen } from '@testing-library/react';
import { NetworkStatus } from '../../../components/ui/NetworkStatus';
import { useNetworkStatus } from '../../../hooks/useNetworkStatus';

// Mock the useNetworkStatus hook
jest.mock('../../../hooks/useNetworkStatus');
const mockUseNetworkStatus = useNetworkStatus as jest.MockedFunction<typeof useNetworkStatus>;

describe('NetworkStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when online with good connection', () => {
    mockUseNetworkStatus.mockReturnValue({
      isOnline: true,
      isSlowConnection: false,
      connectionType: '4g'
    });

    const { container } = render(<NetworkStatus />);
    expect(container.firstChild).toBeNull();
  });

  it('shows offline alert when not online', () => {
    mockUseNetworkStatus.mockReturnValue({
      isOnline: false,
      isSlowConnection: false,
      connectionType: 'unknown'
    });

    render(<NetworkStatus />);

    expect(screen.getByText('網路連線中斷')).toBeInTheDocument();
    expect(screen.getByText('目前無法連接到網路，請檢查您的網路連線。')).toBeInTheDocument();
    expect(screen.getByText('離線時無法進行報名或查詢，請在恢復連線後重試。')).toBeInTheDocument();
  });

  it('shows slow connection warning', () => {
    mockUseNetworkStatus.mockReturnValue({
      isOnline: true,
      isSlowConnection: true,
      connectionType: '2g'
    });

    render(<NetworkStatus />);

    expect(screen.getByText('網路連線較慢')).toBeInTheDocument();
    expect(screen.getByText('偵測到網路連線速度較慢 (2g)，載入可能需要較長時間。')).toBeInTheDocument();
  });

  it('shows online status when showOnlineStatus is true', () => {
    mockUseNetworkStatus.mockReturnValue({
      isOnline: true,
      isSlowConnection: false,
      connectionType: '4g'
    });

    render(<NetworkStatus showOnlineStatus={true} />);

    expect(screen.getByText('網路連線正常')).toBeInTheDocument();
    expect(screen.getByText('網路連線狀態良好 (4g)')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    mockUseNetworkStatus.mockReturnValue({
      isOnline: false,
      isSlowConnection: false,
      connectionType: 'unknown'
    });

    const { container } = render(<NetworkStatus className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('prioritizes offline status over slow connection', () => {
    mockUseNetworkStatus.mockReturnValue({
      isOnline: false,
      isSlowConnection: true,
      connectionType: '2g'
    });

    render(<NetworkStatus />);

    expect(screen.getByText('網路連線中斷')).toBeInTheDocument();
    expect(screen.queryByText('網路連線較慢')).not.toBeInTheDocument();
  });

  it('shows slow connection warning even when showOnlineStatus is true', () => {
    mockUseNetworkStatus.mockReturnValue({
      isOnline: true,
      isSlowConnection: true,
      connectionType: 'slow-2g'
    });

    render(<NetworkStatus showOnlineStatus={true} />);

    expect(screen.getByText('網路連線較慢')).toBeInTheDocument();
    expect(screen.queryByText('網路連線正常')).not.toBeInTheDocument();
  });

  it('handles unknown connection type', () => {
    mockUseNetworkStatus.mockReturnValue({
      isOnline: true,
      isSlowConnection: false,
      connectionType: 'unknown'
    });

    render(<NetworkStatus showOnlineStatus={true} />);

    expect(screen.getByText('網路連線狀態良好 (unknown)')).toBeInTheDocument();
  });
});