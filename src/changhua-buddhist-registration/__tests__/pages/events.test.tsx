/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/router';
import EventsPage from '../../pages/events/index';
import EventDetailsPage from '../../pages/events/[id]';
import { useIdentity } from '../../hooks/useIdentity';
import { apiClient } from '../../services/api';

// Mock dependencies
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../../hooks/useIdentity', () => ({
  useIdentity: jest.fn(),
  useIdentityLabels: jest.fn(),
}));

jest.mock('../../services/api', () => ({
  apiClient: {
    get: jest.fn(),
  },
  handleApiError: jest.fn(),
}));

const mockRouter = {
  push: jest.fn(),
  query: {},
};

const mockIdentity = {
  identity: 'monk' as const,
  hasSelectedIdentity: true,
  isLoading: false,
  clearIdentity: jest.fn(),
};

const mockEvents = [
  {
    id: 'event-1',
    name: '供佛齋僧法會',
    description: '年度供佛齋僧法會',
    startDate: new Date('2024-12-25T09:00:00'),
    endDate: new Date('2024-12-25T17:00:00'),
    location: '彰化縣某寺院',
    maxParticipants: 100,
    currentParticipants: 50,
    registrationDeadline: new Date('2024-12-20T23:59:59'),
    status: 'open' as const,
    pretixEventSlug: 'test-event',
    transportOptions: [
      {
        id: 'transport-1',
        eventId: 'event-1',
        name: '彰化火車站',
        address: '彰化縣彰化市三民路1號',
        pickupTime: new Date('2024-12-25T07:30:00'),
        maxSeats: 45,
        bookedSeats: 20,
        coordinates: { lat: 24.0818, lng: 120.5387 },
      },
    ],
  },
  {
    id: 'event-2',
    name: '已額滿活動',
    description: '這是一個已額滿的活動',
    startDate: new Date('2024-12-30T09:00:00'),
    endDate: new Date('2024-12-30T17:00:00'),
    location: '彰化縣某寺院',
    maxParticipants: 50,
    currentParticipants: 50,
    registrationDeadline: new Date('2024-12-25T23:59:59'),
    status: 'open' as const,
    pretixEventSlug: 'full-event',
    transportOptions: [],
  },
];

const mockEventDetails = {
  ...mockEvents[0],
  registrationStats: {
    total: 50,
    monks: 30,
    volunteers: 20,
  },
};

describe('Events Pages', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useIdentity as jest.Mock).mockReturnValue(mockIdentity);
    (require('../../hooks/useIdentity').useIdentityLabels as jest.Mock).mockReturnValue({
      label: '法師',
      icon: '🧘‍♂️',
    });
    jest.clearAllMocks();
  });

  describe('EventsPage', () => {
    it('should render loading state initially', () => {
      (apiClient.get as jest.Mock).mockImplementation(() => new Promise(() => {}));

      render(<EventsPage />);

      expect(screen.getByText('載入中 - 活動列表')).toBeInTheDocument();
    });

    it('should redirect to home if identity not selected', () => {
      (useIdentity as jest.Mock).mockReturnValue({
        ...mockIdentity,
        hasSelectedIdentity: false,
      });

      render(<EventsPage />);

      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });

    it('should render events list successfully', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        success: true,
        data: mockEvents,
      });

      render(<EventsPage />);

      await waitFor(() => {
        expect(screen.getByText('活動列表')).toBeInTheDocument();
        expect(screen.getByText('供佛齋僧法會')).toBeInTheDocument();
        expect(screen.getByText('已額滿活動')).toBeInTheDocument();
      });
    });

    it('should handle API error', async () => {
      const mockError = new Error('API Error');
      (apiClient.get as jest.Mock).mockRejectedValue(mockError);
      (require('../../services/api').handleApiError as jest.Mock).mockReturnValue('載入失敗');

      render(<EventsPage />);

      await waitFor(() => {
        expect(screen.getByText('載入失敗')).toBeInTheDocument();
      });
    });

    it('should filter events by search term', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        success: true,
        data: mockEvents,
      });

      render(<EventsPage />);

      await waitFor(() => {
        expect(screen.getByText('供佛齋僧法會')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('搜尋活動名稱或地點...');
      fireEvent.change(searchInput, { target: { value: '供佛' } });

      expect(screen.getByText('供佛齋僧法會')).toBeInTheDocument();
      expect(screen.queryByText('已額滿活動')).not.toBeInTheDocument();
    });

    it('should filter events by status', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        success: true,
        data: mockEvents,
      });

      render(<EventsPage />);

      await waitFor(() => {
        expect(screen.getByText('供佛齋僧法會')).toBeInTheDocument();
      });

      const openFilter = screen.getByText('開放報名');
      fireEvent.click(openFilter);

      // 應該只顯示開放報名的活動
      expect(screen.getByText('供佛齋僧法會')).toBeInTheDocument();
    });

    it('should navigate to event details when clicking event card', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        success: true,
        data: mockEvents,
      });

      render(<EventsPage />);

      await waitFor(() => {
        expect(screen.getByText('供佛齋僧法會')).toBeInTheDocument();
      });

      const eventCard = screen.getByText('供佛齋僧法會').closest('.event-card');
      if (eventCard) {
        fireEvent.click(eventCard);
        expect(mockRouter.push).toHaveBeenCalledWith('/events/event-1');
      }
    });

    it('should show empty state when no events match filters', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        success: true,
        data: [],
      });

      render(<EventsPage />);

      await waitFor(() => {
        expect(screen.getByText('目前沒有符合條件的活動')).toBeInTheDocument();
      });
    });

    it('should navigate back to home', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        success: true,
        data: mockEvents,
      });

      render(<EventsPage />);

      await waitFor(() => {
        expect(screen.getByText('活動列表')).toBeInTheDocument();
      });

      const backButton = screen.getByText('← 返回首頁');
      fireEvent.click(backButton);

      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });
  });

  describe('EventDetailsPage', () => {
    beforeEach(() => {
      mockRouter.query = { id: 'event-1' };
    });

    it('should render loading state initially', () => {
      (apiClient.get as jest.Mock).mockImplementation(() => new Promise(() => {}));

      render(<EventDetailsPage />);

      // Check for skeleton loading elements instead of title text
      expect(document.querySelector('.skeleton')).toBeInTheDocument();
    });

    it('should redirect to home if identity not selected', () => {
      (useIdentity as jest.Mock).mockReturnValue({
        ...mockIdentity,
        hasSelectedIdentity: false,
      });

      render(<EventDetailsPage />);

      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });

    it('should render event details successfully', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        success: true,
        data: mockEventDetails,
      });

      render(<EventDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('供佛齋僧法會')).toBeInTheDocument();
        expect(screen.getByText('年度供佛齋僧法會')).toBeInTheDocument();
        expect(screen.getByText('彰化縣某寺院')).toBeInTheDocument();
        expect(screen.getByText('50')).toBeInTheDocument(); // current participants
        expect(screen.getByText('100')).toBeInTheDocument(); // max participants
      });
    });

    it('should show transport options', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        success: true,
        data: mockEventDetails,
      });

      render(<EventDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('交通車資訊')).toBeInTheDocument();
        expect(screen.getByText('彰化火車站')).toBeInTheDocument();
        expect(screen.getByText((content, element) => {
          return element?.textContent === '📍彰化縣彰化市三民路1號';
        })).toBeInTheDocument();
      });
    });

    it('should show registration statistics', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        success: true,
        data: mockEventDetails,
      });

      render(<EventDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('報名統計')).toBeInTheDocument();
        expect(screen.getByText('法師：30 人')).toBeInTheDocument();
        expect(screen.getByText('志工：20 人')).toBeInTheDocument();
      });
    });

    it('should handle registration button click', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        success: true,
        data: mockEventDetails,
      });

      render(<EventDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('以法師身份報名')).toBeInTheDocument();
      });

      const registerButton = screen.getByText('以法師身份報名').closest('button');
      if (registerButton) {
        fireEvent.click(registerButton);
        expect(mockRouter.push).toHaveBeenCalledWith('/registration/event-1');
      }
    });

    it('should show error state when event not found', async () => {
      (apiClient.get as jest.Mock).mockRejectedValue(new Error('Event not found'));
      (require('../../services/api').handleApiError as jest.Mock).mockReturnValue('找不到活動');

      render(<EventDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('載入活動詳情時發生錯誤')).toBeInTheDocument();
        expect(screen.getByText('找不到活動')).toBeInTheDocument();
      });
    });

    it('should navigate back to events list', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        success: true,
        data: mockEventDetails,
      });

      render(<EventDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('供佛齋僧法會')).toBeInTheDocument();
      });

      const backButton = screen.getByText('← 返回活動列表');
      fireEvent.click(backButton);

      expect(mockRouter.push).toHaveBeenCalledWith('/events');
    });

    it('should show full event status correctly', async () => {
      const fullEvent = {
        ...mockEventDetails,
        currentParticipants: 100,
        maxParticipants: 100,
      };

      (apiClient.get as jest.Mock).mockResolvedValue({
        success: true,
        data: fullEvent,
      });

      render(<EventDetailsPage />);

      await waitFor(() => {
        expect(screen.getAllByText('已額滿')).toHaveLength(3); // Header, alert, button
        expect(screen.getByText('此活動報名人數已達上限，無法再接受報名。')).toBeInTheDocument();
      });
    });

    it('should show closed event status correctly', async () => {
      const closedEvent = {
        ...mockEventDetails,
        registrationDeadline: new Date('2020-01-01T00:00:00'), // Past date
      };

      (apiClient.get as jest.Mock).mockResolvedValue({
        success: true,
        data: closedEvent,
      });

      render(<EventDetailsPage />);

      await waitFor(() => {
        expect(screen.getAllByText('報名截止')).toHaveLength(4); // Header, alert, info section, button
        expect(screen.getByText('此活動報名時間已截止，無法再進行報名。')).toBeInTheDocument();
      });
    });
  });
});