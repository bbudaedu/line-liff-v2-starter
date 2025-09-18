import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransportConfirmation } from '../../../components/transport/TransportConfirmation';
import { TransportOption } from '../../../types';

describe('TransportConfirmation', () => {
  const mockTransportOption: TransportOption = {
    id: 'location-1',
    eventId: 'test-event-1',
    name: '彰化火車站',
    address: '彰化縣彰化市三民路1號',
    pickupTime: new Date('2024-01-15T07:30:00'),
    maxSeats: 45,
    bookedSeats: 32,
    coordinates: { lat: 24.0818, lng: 120.5387 }
  };

  const mockProps = {
    selectedTransport: mockTransportOption,
    onEdit: jest.fn(),
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
    loading: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders confirmation interface correctly', () => {
    render(<TransportConfirmation {...mockProps} />);
    
    expect(screen.getByText('確認交通車登記')).toBeInTheDocument();
    expect(screen.getByText('請確認您的交通車登記資訊')).toBeInTheDocument();
  });

  it('displays transport details correctly', () => {
    render(<TransportConfirmation {...mockProps} />);
    
    expect(screen.getByText('彰化火車站')).toBeInTheDocument();
    expect(screen.getByText('彰化縣彰化市三民路1號')).toBeInTheDocument();
    expect(screen.getByText('07:30')).toBeInTheDocument();
    expect(screen.getByText('已預訂：33/45')).toBeInTheDocument();
    expect(screen.getByText('※ 包含您的座位')).toBeInTheDocument();
  });

  it('displays date and time correctly', () => {
    render(<TransportConfirmation {...mockProps} />);
    
    // Check if date is formatted correctly (will depend on locale)
    expect(screen.getByText(/2024年1月15日/)).toBeInTheDocument();
    expect(screen.getByText('07:30')).toBeInTheDocument();
  });

  it('shows important notes', () => {
    render(<TransportConfirmation {...mockProps} />);
    
    expect(screen.getByText('重要提醒')).toBeInTheDocument();
    expect(screen.getByText('請提前 10 分鐘到達上車地點')).toBeInTheDocument();
    expect(screen.getByText('請攜帶身分證明文件以便核對身份')).toBeInTheDocument();
    expect(screen.getByText('如需取消或變更，請於活動前 3 天聯繫主辦單位')).toBeInTheDocument();
    expect(screen.getByText('交通車將準時發車，請勿遲到')).toBeInTheDocument();
  });

  it('handles edit button click', () => {
    render(<TransportConfirmation {...mockProps} />);
    
    const editButton = screen.getByText('重新選擇');
    fireEvent.click(editButton);
    
    expect(mockProps.onEdit).toHaveBeenCalled();
  });

  it('handles confirm button click', () => {
    render(<TransportConfirmation {...mockProps} />);
    
    const confirmButton = screen.getByText('確認登記');
    fireEvent.click(confirmButton);
    
    expect(mockProps.onConfirm).toHaveBeenCalled();
  });

  it('handles cancel button click', () => {
    render(<TransportConfirmation {...mockProps} />);
    
    const cancelButton = screen.getByText('取消交通車登記');
    fireEvent.click(cancelButton);
    
    expect(mockProps.onCancel).toHaveBeenCalled();
  });

  it('disables buttons when loading', () => {
    const loadingProps = {
      ...mockProps,
      loading: true
    };

    render(<TransportConfirmation {...loadingProps} />);
    
    expect(screen.getByText('重新選擇')).toBeDisabled();
    expect(screen.getByText('確認登記')).toBeDisabled();
    expect(screen.getByText('取消交通車登記')).toBeDisabled();
  });

  it('shows loading state on confirm button', () => {
    const loadingProps = {
      ...mockProps,
      loading: true
    };

    render(<TransportConfirmation {...loadingProps} />);
    
    // The button should show loading state (implementation depends on Button component)
    const confirmButton = screen.getByText('確認登記');
    expect(confirmButton).toBeDisabled();
  });

  it('displays no transport option correctly', () => {
    const noTransportProps = {
      ...mockProps,
      selectedTransport: null
    };

    render(<TransportConfirmation {...noTransportProps} />);
    
    expect(screen.getByText('自行前往')).toBeInTheDocument();
    expect(screen.getByText('您選擇自行前往活動地點，請注意活動時間和地點資訊。')).toBeInTheDocument();
    expect(screen.getByText('請提前規劃交通路線')).toBeInTheDocument();
    expect(screen.getByText('建議提前 30 分鐘到達活動地點')).toBeInTheDocument();
    expect(screen.getByText('如有停車需求，請提前了解停車資訊')).toBeInTheDocument();
  });

  it('shows car emoji for no transport option', () => {
    const noTransportProps = {
      ...mockProps,
      selectedTransport: null
    };

    render(<TransportConfirmation {...noTransportProps} />);
    
    expect(screen.getByText('🚗')).toBeInTheDocument();
  });

  it('shows cancel note', () => {
    render(<TransportConfirmation {...mockProps} />);
    
    expect(screen.getByText('取消後您可以稍後重新登記交通車')).toBeInTheDocument();
  });

  it('formats pickup time correctly for different times', () => {
    const differentTimeTransport = {
      ...mockTransportOption,
      pickupTime: new Date('2024-01-15T14:45:00')
    };

    const propsWithDifferentTime = {
      ...mockProps,
      selectedTransport: differentTimeTransport
    };

    render(<TransportConfirmation {...propsWithDifferentTime} />);
    
    expect(screen.getByText('14:45')).toBeInTheDocument();
  });

  it('calculates seat count correctly including user seat', () => {
    render(<TransportConfirmation {...mockProps} />);
    
    // Original bookedSeats: 32, with user: 33, total: 45
    expect(screen.getByText('已預訂：33/45')).toBeInTheDocument();
  });
});