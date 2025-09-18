import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import styles from './monitoring.module.css';

interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: 'ok' | 'error';
    pretix: 'ok' | 'error';
    line: 'ok' | 'error';
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

interface SystemMetrics {
  timestamp: string;
  application: {
    name: string;
    version: string;
    environment: string;
    uptime: number;
  };
  system: {
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
    };
    cpu: {
      usage: number;
      loadAverage: number[];
    };
  };
  counters: {
    httpRequests: number;
    errors: number;
    registrations: number;
    lineMessages: number;
  };
}

const MonitoringDashboard: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealthStatus = async () => {
    try {
      const response = await fetch('/api/health');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setHealthStatus(data);
    } catch (err) {
      console.error('Failed to fetch health status:', err);
      setError('Failed to fetch health status');
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/monitoring/metrics');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
      setError('Failed to fetch metrics');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    await Promise.all([
      fetchHealthStatus(),
      fetchMetrics()
    ]);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'ok':
      case 'operational':
        return '#10b981'; // green
      case 'error':
      case 'degraded':
        return '#ef4444'; // red
      default:
        return '#f59e0b'; // yellow
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'ok':
      case 'operational':
        return '✅';
      case 'error':
      case 'outage':
        return '❌';
      default:
        return '⚠️';
    }
  };

  if (loading && !healthStatus && !metrics) {
    return (
      <div className={styles.container}>
        <Head>
          <title>系統監控 - 彰化供佛齋僧報名系統</title>
        </Head>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>載入監控資料中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>系統監控 - 彰化供佛齋僧報名系統</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <header className={styles.header}>
        <h1>系統監控儀表板</h1>
        <div className={styles.controls}>
          <label className={styles.autoRefreshToggle}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            自動更新 (30秒)
          </label>
          <button 
            className={styles.refreshButton}
            onClick={fetchData}
            disabled={loading}
          >
            {loading ? '更新中...' : '手動更新'}
          </button>
        </div>
      </header>

      {error && (
        <div className={styles.error}>
          <p>⚠️ {error}</p>
        </div>
      )}

      <div className={styles.dashboard}>
        {/* System Health Overview */}
        <div className={styles.card}>
          <h2>系統健康狀態</h2>
          {healthStatus ? (
            <div className={styles.healthOverview}>
              <div 
                className={styles.overallStatus}
                style={{ backgroundColor: getStatusColor(healthStatus.status) }}
              >
                <span className={styles.statusIcon}>
                  {getStatusIcon(healthStatus.status)}
                </span>
                <span className={styles.statusText}>
                  {healthStatus.status === 'ok' ? '正常運行' : '系統異常'}
                </span>
              </div>
              
              <div className={styles.systemInfo}>
                <div className={styles.infoItem}>
                  <label>運行時間:</label>
                  <span>{formatUptime(healthStatus.uptime)}</span>
                </div>
                <div className={styles.infoItem}>
                  <label>版本:</label>
                  <span>{healthStatus.version}</span>
                </div>
                <div className={styles.infoItem}>
                  <label>最後更新:</label>
                  <span>{new Date(healthStatus.timestamp).toLocaleString('zh-TW')}</span>
                </div>
              </div>
            </div>
          ) : (
            <p>無法取得健康狀態資料</p>
          )}
        </div>

        {/* Services Status */}
        <div className={styles.card}>
          <h2>服務狀態</h2>
          {healthStatus ? (
            <div className={styles.servicesGrid}>
              <div className={styles.serviceItem}>
                <span className={styles.serviceIcon}>
                  {getStatusIcon(healthStatus.services.database)}
                </span>
                <div className={styles.serviceInfo}>
                  <h3>資料庫</h3>
                  <span 
                    className={styles.serviceStatus}
                    style={{ color: getStatusColor(healthStatus.services.database) }}
                  >
                    {healthStatus.services.database === 'ok' ? '正常' : '異常'}
                  </span>
                </div>
              </div>

              <div className={styles.serviceItem}>
                <span className={styles.serviceIcon}>
                  {getStatusIcon(healthStatus.services.pretix)}
                </span>
                <div className={styles.serviceInfo}>
                  <h3>Pretix API</h3>
                  <span 
                    className={styles.serviceStatus}
                    style={{ color: getStatusColor(healthStatus.services.pretix) }}
                  >
                    {healthStatus.services.pretix === 'ok' ? '正常' : '異常'}
                  </span>
                </div>
              </div>

              <div className={styles.serviceItem}>
                <span className={styles.serviceIcon}>
                  {getStatusIcon(healthStatus.services.line)}
                </span>
                <div className={styles.serviceInfo}>
                  <h3>LINE API</h3>
                  <span 
                    className={styles.serviceStatus}
                    style={{ color: getStatusColor(healthStatus.services.line) }}
                  >
                    {healthStatus.services.line === 'ok' ? '正常' : '異常'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p>無法取得服務狀態資料</p>
          )}
        </div>

        {/* System Resources */}
        <div className={styles.card}>
          <h2>系統資源</h2>
          {healthStatus && metrics ? (
            <div className={styles.resourcesGrid}>
              <div className={styles.resourceItem}>
                <h3>記憶體使用率</h3>
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill}
                    style={{ 
                      width: `${healthStatus.memory.percentage}%`,
                      backgroundColor: healthStatus.memory.percentage > 80 ? '#ef4444' : '#10b981'
                    }}
                  ></div>
                </div>
                <p>{healthStatus.memory.percentage}% ({healthStatus.memory.used}MB / {healthStatus.memory.total}MB)</p>
              </div>

              <div className={styles.resourceItem}>
                <h3>CPU 使用率</h3>
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill}
                    style={{ 
                      width: `${metrics.system.cpu.usage}%`,
                      backgroundColor: metrics.system.cpu.usage > 80 ? '#ef4444' : '#10b981'
                    }}
                  ></div>
                </div>
                <p>{metrics.system.cpu.usage}%</p>
              </div>

              <div className={styles.resourceItem}>
                <h3>堆積記憶體</h3>
                <p>已使用: {formatBytes(metrics.system.memory.heapUsed * 1024 * 1024)}</p>
                <p>總計: {formatBytes(metrics.system.memory.heapTotal * 1024 * 1024)}</p>
              </div>
            </div>
          ) : (
            <p>無法取得資源使用資料</p>
          )}
        </div>

        {/* Application Metrics */}
        <div className={styles.card}>
          <h2>應用程式指標</h2>
          {metrics ? (
            <div className={styles.metricsGrid}>
              <div className={styles.metricItem}>
                <h3>HTTP 請求</h3>
                <span className={styles.metricValue}>{metrics.counters.httpRequests.toLocaleString()}</span>
              </div>

              <div className={styles.metricItem}>
                <h3>錯誤數量</h3>
                <span className={styles.metricValue} style={{ color: '#ef4444' }}>
                  {metrics.counters.errors.toLocaleString()}
                </span>
              </div>

              <div className={styles.metricItem}>
                <h3>報名數量</h3>
                <span className={styles.metricValue} style={{ color: '#10b981' }}>
                  {metrics.counters.registrations.toLocaleString()}
                </span>
              </div>

              <div className={styles.metricItem}>
                <h3>LINE 訊息</h3>
                <span className={styles.metricValue}>
                  {metrics.counters.lineMessages.toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <p>無法取得應用程式指標</p>
          )}
        </div>

        {/* System Information */}
        <div className={styles.card}>
          <h2>系統資訊</h2>
          {metrics ? (
            <div className={styles.systemInfoGrid}>
              <div className={styles.infoItem}>
                <label>應用程式名稱:</label>
                <span>{metrics.application.name}</span>
              </div>
              <div className={styles.infoItem}>
                <label>環境:</label>
                <span className={styles.environmentBadge}>
                  {metrics.application.environment}
                </span>
              </div>
              <div className={styles.infoItem}>
                <label>版本:</label>
                <span>{metrics.application.version}</span>
              </div>
              <div className={styles.infoItem}>
                <label>運行時間:</label>
                <span>{formatUptime(metrics.application.uptime)}</span>
              </div>
              <div className={styles.infoItem}>
                <label>平台:</label>
                <span>{(metrics.system as any).platform || 'N/A'}</span>
              </div>
              <div className={styles.infoItem}>
                <label>架構:</label>
                <span>{(metrics.system as any).arch || 'N/A'}</span>
              </div>
            </div>
          ) : (
            <p>無法取得系統資訊</p>
          )}
        </div>
      </div>

      <footer className={styles.footer}>
        <p>彰化供佛齋僧活動報名系統 - 監控儀表板</p>
        <p>最後更新: {new Date().toLocaleString('zh-TW')}</p>
      </footer>
    </div>
  );
};

export default MonitoringDashboard;