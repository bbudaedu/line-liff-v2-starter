import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Event, PageProps } from '@/types';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner, Skeleton } from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import { Container } from '@/components/layout/Grid';
import { useIdentity } from '@/hooks/useIdentity';
import { apiClient, handleApiError } from '@/services/api';
import { formatDate, formatTime, isEventFull, isEventClosed } from '@/utils/helpers';

export default function EventsPage({ className, liffProfile, isInLineClient }: PageProps) {
  const router = useRouter();
  const { identity, hasSelectedIdentity } = useIdentity();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closing-soon'>('all');

  useEffect(() => {
    if (!hasSelectedIdentity) {
      router.push('/');
      return;
    }
    
    loadEvents();
  }, [hasSelectedIdentity, router]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get<Event[]>('/api/v1/events');
      
      if (response.success && response.data) {
        setEvents(response.data);
      } else {
        throw new Error(response.message || '無法載入活動列表');
      }
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (eventId: string) => {
    router.push(`/events/${eventId}`);
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  const filteredEvents = events.filter(event => {
    // 搜尋過濾
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 狀態過濾
    let matchesFilter = true;
    if (filterStatus === 'open') {
      matchesFilter = event.status === 'open' && !isEventClosed(event);
    } else if (filterStatus === 'closing-soon') {
      const deadline = new Date(event.registrationDeadline);
      const now = new Date();
      const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
      matchesFilter = hoursUntilDeadline <= 24 && hoursUntilDeadline > 0;
    }
    
    return matchesSearch && matchesFilter;
  });

  const getEventStatusInfo = (event: Event) => {
    if (isEventFull(event)) {
      return { status: 'full', text: '已額滿', color: 'error' };
    }
    if (isEventClosed(event)) {
      return { status: 'closed', text: '報名截止', color: 'warning' };
    }
    
    const deadline = new Date(event.registrationDeadline);
    const now = new Date();
    const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilDeadline <= 24 && hoursUntilDeadline > 0) {
      return { status: 'closing-soon', text: '即將截止', color: 'warning' };
    }
    
    return { status: 'open', text: '開放報名', color: 'success' };
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>載入中 - 活動列表</title>
        </Head>
        <Container className="events-page">
          <div className="page-header">
            <Skeleton height={40} width="60%" />
            <Skeleton height={20} width="40%" />
          </div>
          <div className="events-grid">
            {[1, 2, 3].map(i => (
              <Card key={i} className="event-card-skeleton">
                <CardHeader>
                  <Skeleton height={24} width="80%" />
                  <Skeleton height={16} width="60%" />
                </CardHeader>
                <CardContent>
                  <Skeleton height={16} width="100%" />
                  <Skeleton height={16} width="70%" />
                  <Skeleton height={16} width="50%" />
                </CardContent>
                <CardFooter>
                  <Skeleton height={40} width="100%" />
                </CardFooter>
              </Card>
            ))}
          </div>
        </Container>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>活動列表 - 彰化供佛齋僧活動報名系統</title>
        <meta name="description" content="瀏覽可報名的供佛齋僧活動，選擇適合的活動進行報名" />
      </Head>

      <Container className={`events-page ${className || ''}`}>
        <header className="page-header">
          <div className="header-content">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBackToHome}
              className="back-button"
            >
              ← 返回首頁
            </Button>
            <h1 className="page-title traditional-font">活動列表</h1>
            <p className="page-subtitle rounded-font">選擇您要報名的供佛齋僧活動</p>
          </div>
        </header>

        {error && (
          <Alert variant="error" className="error-alert">
            <div className="error-content">
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={loadEvents}>
                重新載入
              </Button>
            </div>
          </Alert>
        )}

        <div className="filters-section">
          <div className="search-filter">
            <input
              type="text"
              placeholder="搜尋活動名稱或地點..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input rounded-font"
            />
          </div>
          
          <div className="status-filters">
            <button
              className={`filter-button ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              全部活動
            </button>
            <button
              className={`filter-button ${filterStatus === 'open' ? 'active' : ''}`}
              onClick={() => setFilterStatus('open')}
            >
              開放報名
            </button>
            <button
              className={`filter-button ${filterStatus === 'closing-soon' ? 'active' : ''}`}
              onClick={() => setFilterStatus('closing-soon')}
            >
              即將截止
            </button>
          </div>
        </div>

        <main className="events-content">
          {filteredEvents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <h3 className="traditional-font">目前沒有符合條件的活動</h3>
              <p className="rounded-font">
                {searchTerm || filterStatus !== 'all' 
                  ? '請嘗試調整搜尋條件或篩選器'
                  : '目前沒有開放報名的活動，請稍後再來查看'
                }
              </p>
              {(searchTerm || filterStatus !== 'all') && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('all');
                  }}
                >
                  清除篩選
                </Button>
              )}
            </div>
          ) : (
            <div className="events-grid">
              {filteredEvents.map((event) => {
                const statusInfo = getEventStatusInfo(event);
                const canRegister = statusInfo.status === 'open' || statusInfo.status === 'closing-soon';
                
                return (
                  <Card 
                    key={event.id} 
                    className="event-card"
                    hoverable
                    clickable
                    onClick={() => handleEventClick(event.id)}
                  >
                    <CardHeader>
                      <div className="event-header">
                        <h3 className="event-title traditional-font">{event.name}</h3>
                        <span className={`event-status status-${statusInfo.color}`}>
                          {statusInfo.text}
                        </span>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="event-details">
                        <div className="detail-item">
                          <span className="detail-icon">📅</span>
                          <span className="detail-text rounded-font">
                            {formatDate(event.startDate)}
                          </span>
                        </div>
                        
                        <div className="detail-item">
                          <span className="detail-icon">🕐</span>
                          <span className="detail-text rounded-font">
                            {formatTime(event.startDate)} - {formatTime(event.endDate)}
                          </span>
                        </div>
                        
                        <div className="detail-item">
                          <span className="detail-icon">📍</span>
                          <span className="detail-text rounded-font">
                            {event.location}
                          </span>
                        </div>
                        
                        <div className="detail-item">
                          <span className="detail-icon">👥</span>
                          <span className="detail-text rounded-font">
                            {event.currentParticipants} / {event.maxParticipants} 人
                          </span>
                        </div>
                        
                        <div className="detail-item">
                          <span className="detail-icon">⏰</span>
                          <span className="detail-text rounded-font">
                            報名截止：{formatDate(event.registrationDeadline)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                    
                    <CardFooter>
                      <Button 
                        variant={canRegister ? 'primary' : 'outline'}
                        fullWidth
                        disabled={!canRegister}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEventClick(event.id);
                        }}
                      >
                        {canRegister ? '查看詳情' : statusInfo.text}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </Container>

      <style jsx>{`
        .events-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          padding-bottom: 40px;
        }

        .page-header {
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
          color: white;
          padding: 20px 0 30px;
          margin-bottom: 30px;
        }

        .header-content {
          position: relative;
          text-align: center;
        }

        .back-button {
          position: absolute;
          left: 0;
          top: 0;
          color: white;
          border-color: rgba(255, 255, 255, 0.3);
        }

        .back-button:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.5);
        }

        .page-title {
          font-size: 28px;
          font-weight: 900;
          margin-bottom: 8px;
        }

        .page-subtitle {
          font-size: 16px;
          opacity: 0.9;
        }

        .error-alert {
          margin-bottom: 20px;
        }

        .error-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        .filters-section {
          background: white;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 30px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        }

        .search-filter {
          margin-bottom: 16px;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid var(--border-light);
          border-radius: 12px;
          font-size: 16px;
          transition: border-color 0.3s ease;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--primary-color);
        }

        .status-filters {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .filter-button {
          padding: 8px 16px;
          border: 2px solid var(--border-light);
          border-radius: 20px;
          background: white;
          color: var(--text-secondary);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .filter-button:hover {
          border-color: var(--primary-color);
          color: var(--primary-color);
        }

        .filter-button.active {
          background: var(--primary-color);
          border-color: var(--primary-color);
          color: white;
        }

        .events-content {
          margin-top: 20px;
        }

        .events-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
        }

        .event-card {
          background: white;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .event-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
        }

        .event-card-skeleton {
          background: white;
        }

        .event-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .event-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
          flex: 1;
          line-height: 1.3;
        }

        .event-status {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .status-success {
          background: #e8f5e8;
          color: #2e7d32;
        }

        .status-warning {
          background: #fff3e0;
          color: #f57c00;
        }

        .status-error {
          background: #ffebee;
          color: #d32f2f;
        }

        .event-details {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .detail-icon {
          font-size: 16px;
          width: 20px;
          text-align: center;
          flex-shrink: 0;
        }

        .detail-text {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 20px;
        }

        .empty-state h3 {
          font-size: 24px;
          color: var(--text-primary);
          margin-bottom: 12px;
        }

        .empty-state p {
          font-size: 16px;
          color: var(--text-secondary);
          margin-bottom: 24px;
          line-height: 1.5;
        }

        /* 響應式設計 */
        @media (max-width: 768px) {
          .events-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .page-header {
            padding: 16px 0 24px;
            margin-bottom: 20px;
          }

          .page-title {
            font-size: 24px;
          }

          .page-subtitle {
            font-size: 14px;
          }

          .filters-section {
            padding: 16px;
            margin-bottom: 20px;
          }

          .search-input {
            padding: 10px 14px;
            font-size: 14px;
          }

          .filter-button {
            padding: 6px 12px;
            font-size: 13px;
          }

          .event-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .event-title {
            font-size: 18px;
          }

          .detail-item {
            gap: 10px;
          }

          .detail-text {
            font-size: 13px;
          }

          .empty-state {
            padding: 40px 16px;
          }

          .empty-icon {
            font-size: 48px;
          }

          .empty-state h3 {
            font-size: 20px;
          }

          .empty-state p {
            font-size: 14px;
          }
        }

        @media (max-width: 480px) {
          .header-content {
            padding: 0 12px;
          }

          .back-button {
            position: static;
            margin-bottom: 16px;
          }

          .status-filters {
            justify-content: center;
          }

          .filter-button {
            flex: 1;
            min-width: 0;
            text-align: center;
          }
        }
      `}</style>
    </>
  );
}