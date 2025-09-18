import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { PageProps } from '@/types';
import styles from './info.module.css';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'registration' | 'event' | 'transport' | 'general';
}

interface NewsItem {
  id: string;
  title: string;
  content: string;
  date: string;
  type: 'announcement' | 'reminder' | 'update';
  important: boolean;
}

export default function InfoPage({ className, liffProfile, isInLineClient }: PageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'news' | 'faq' | 'contact'>('news');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // 最新活動訊息
  const newsItems: NewsItem[] = [
    {
      id: '1',
      title: '2024年春季供佛齋僧活動開始報名',
      content: '親愛的法師與志工們，2024年春季供佛齋僧活動即將開始報名。本次活動將於4月15日舉行，地點在彰化縣佛教會館。歡迎大家踴躍參與，共同成就這場殊勝的法會。',
      date: '2024-03-01',
      type: 'announcement',
      important: true
    },
    {
      id: '2',
      title: '交通車路線調整通知',
      content: '因應道路施工，彰化火車站接駁路線將有所調整。新的上車地點改為彰化火車站東出口，請已報名交通車的參與者特別注意。',
      date: '2024-03-05',
      type: 'update',
      important: true
    },
    {
      id: '3',
      title: '活動當日注意事項',
      content: '請參與者務必攜帶身分證明文件，並於活動開始前30分鐘抵達會場。現場將提供素食便當，有特殊飲食需求者請提前告知。',
      date: '2024-03-10',
      type: 'reminder',
      important: false
    },
    {
      id: '4',
      title: '報名系統維護通知',
      content: '系統將於3月20日晚上10點至11點進行例行維護，期間可能無法正常使用報名功能，造成不便敬請見諒。',
      date: '2024-03-15',
      type: 'update',
      important: false
    }
  ];

  // 常見問題
  const faqItems: FAQItem[] = [
    {
      id: '1',
      question: '如何進行活動報名？',
      answer: '請先選擇您的身份（法師或志工），然後瀏覽可報名的活動，點選您要參加的活動後填寫個人資料即可完成報名。系統會自動發送確認訊息到您的 LINE。',
      category: 'registration'
    },
    {
      id: '2',
      question: '可以修改已提交的報名資料嗎？',
      answer: '可以的。在活動開始前48小時內，您可以透過「報名查詢」功能修改您的個人資料。超過時限後如需修改，請聯繫主辦單位。',
      category: 'registration'
    },
    {
      id: '3',
      question: '交通車的上車地點和時間？',
      answer: '目前提供彰化火車站和員林轉運站兩個上車地點。彰化火車站發車時間為上午7:30，員林轉運站為上午8:00。請提前10分鐘到達上車地點。',
      category: 'transport'
    },
    {
      id: '4',
      question: '活動當天需要攜帶什麼？',
      answer: '請攜帶身分證明文件、報名確認訊息截圖，以及個人水杯。現場會提供素食便當和茶水。如有特殊需求請提前告知。',
      category: 'event'
    },
    {
      id: '5',
      question: '如果臨時無法參加怎麼辦？',
      answer: '如果臨時無法參加，請盡早透過系統取消報名或聯繫主辦單位，以便將名額讓給其他需要的人。活動前24小時內取消可能會影響餐點準備。',
      category: 'registration'
    },
    {
      id: '6',
      question: '活動是否提供停車位？',
      answer: '會場提供有限的停車位，建議優先使用大眾運輸工具或報名交通車。如需開車前往，請提早抵達以確保有停車位。',
      category: 'transport'
    },
    {
      id: '7',
      question: '法師和志工的報名有什麼不同？',
      answer: '法師需要填寫法名、俗名、寺院名稱等資訊；志工則需要填寫姓名、緊急聯絡人等資訊。兩者在活動中的安排和用餐可能會有所不同。',
      category: 'general'
    },
    {
      id: '8',
      question: '系統支援哪些瀏覽器？',
      answer: '本系統建議使用 LINE 內建瀏覽器開啟，也支援 Chrome、Safari、Firefox 等主流瀏覽器的最新版本。建議保持瀏覽器為最新版本以獲得最佳體驗。',
      category: 'general'
    }
  ];

  // 聯絡資訊
  const contactInfo = {
    organization: '彰化縣佛教會',
    address: '彰化縣彰化市中山路二段123號',
    phone: '04-1234-5678',
    email: 'info@changhua-buddhist.org.tw',
    lineId: '@changhua-buddhist',
    office_hours: '週一至週五 上午9:00-下午5:00',
    emergency_contact: '0912-345-678（活動當日緊急聯絡）'
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  const toggleFAQ = (faqId: string) => {
    setExpandedFAQ(expandedFAQ === faqId ? null : faqId);
  };

  const filteredFAQs = selectedCategory === 'all' 
    ? faqItems 
    : faqItems.filter(item => item.category === selectedCategory);

  const getNewsTypeLabel = (type: NewsItem['type']) => {
    switch (type) {
      case 'announcement': return '公告';
      case 'reminder': return '提醒';
      case 'update': return '更新';
      default: return '訊息';
    }
  };

  const getCategoryLabel = (category: FAQItem['category']) => {
    switch (category) {
      case 'registration': return '報名相關';
      case 'event': return '活動相關';
      case 'transport': return '交通相關';
      case 'general': return '一般問題';
      default: return '其他';
    }
  };

  return (
    <>
      <Head>
        <title>活動資訊 - 彰化供佛齋僧活動報名系統</title>
        <meta name="description" content="查看最新活動訊息、常見問題和聯絡資訊" />
      </Head>

      <div className={`${styles.infoPage} ${className || ''}`}>
        <header className={styles.pageHeader}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackToHome}
            className={styles.backButton}
            aria-label="返回首頁"
          >
            ← 返回首頁
          </Button>
          <h1 className={`${styles.pageTitle} traditional-font decorated-title`}>
            活動資訊
          </h1>
          <p className={`${styles.pageSubtitle} rounded-font`}>
            最新訊息與常見問題
          </p>
        </header>

        <main className={styles.pageContent}>
          {/* 標籤導航 */}
          <nav className={styles.tabNavigation} role="tablist">
            <button
              className={`${styles.tabButton} ${activeTab === 'news' ? styles.active : ''}`}
              onClick={() => setActiveTab('news')}
              role="tab"
              aria-selected={activeTab === 'news'}
              aria-controls="news-panel"
            >
              <span className={styles.tabIcon}>📢</span>
              <span className="traditional-font">最新訊息</span>
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'faq' ? styles.active : ''}`}
              onClick={() => setActiveTab('faq')}
              role="tab"
              aria-selected={activeTab === 'faq'}
              aria-controls="faq-panel"
            >
              <span className={styles.tabIcon}>❓</span>
              <span className="traditional-font">常見問題</span>
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'contact' ? styles.active : ''}`}
              onClick={() => setActiveTab('contact')}
              role="tab"
              aria-selected={activeTab === 'contact'}
              aria-controls="contact-panel"
            >
              <span className={styles.tabIcon}>📞</span>
              <span className="traditional-font">聯絡我們</span>
            </button>
          </nav>

          {/* 最新訊息面板 */}
          {activeTab === 'news' && (
            <section 
              id="news-panel" 
              className={styles.tabPanel}
              role="tabpanel"
              aria-labelledby="news-tab"
            >
              <div className={styles.newsSection}>
                <h2 className={`${styles.sectionTitle} traditional-font`}>
                  最新活動訊息
                </h2>
                <p className={`${styles.sectionDescription} rounded-font`}>
                  掌握最新的活動資訊和重要通知
                </p>

                <div className={styles.newsList}>
                  {newsItems.map((news) => (
                    <Card key={news.id} className={styles.newsCard}>
                      <div className={styles.newsHeader}>
                        <div className={styles.newsMetadata}>
                          <span className={`${styles.newsType} ${styles[news.type]}`}>
                            {getNewsTypeLabel(news.type)}
                          </span>
                          <time className={styles.newsDate} dateTime={news.date}>
                            {new Date(news.date).toLocaleDateString('zh-TW', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </time>
                        </div>
                        {news.important && (
                          <span className={styles.importantBadge} aria-label="重要訊息">
                            ⚠️ 重要
                          </span>
                        )}
                      </div>
                      <h3 className={`${styles.newsTitle} traditional-font`}>
                        {news.title}
                      </h3>
                      <p className={`${styles.newsContent} rounded-font`}>
                        {news.content}
                      </p>
                    </Card>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* 常見問題面板 */}
          {activeTab === 'faq' && (
            <section 
              id="faq-panel" 
              className={styles.tabPanel}
              role="tabpanel"
              aria-labelledby="faq-tab"
            >
              <div className={styles.faqSection}>
                <h2 className={`${styles.sectionTitle} traditional-font`}>
                  常見問題
                </h2>
                <p className={`${styles.sectionDescription} rounded-font`}>
                  快速找到您需要的答案
                </p>

                {/* 分類篩選 */}
                <div className={styles.categoryFilter}>
                  <label htmlFor="category-select" className="rounded-font">
                    問題分類：
                  </label>
                  <select
                    id="category-select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className={styles.categorySelect}
                  >
                    <option value="all">全部問題</option>
                    <option value="registration">報名相關</option>
                    <option value="event">活動相關</option>
                    <option value="transport">交通相關</option>
                    <option value="general">一般問題</option>
                  </select>
                </div>

                <div className={styles.faqList}>
                  {filteredFAQs.map((faq) => (
                    <Card key={faq.id} className={styles.faqCard}>
                      <button
                        className={styles.faqQuestion}
                        onClick={() => toggleFAQ(faq.id)}
                        aria-expanded={expandedFAQ === faq.id}
                        aria-controls={`faq-answer-${faq.id}`}
                      >
                        <div className={styles.questionContent}>
                          <span className={styles.categoryTag}>
                            {getCategoryLabel(faq.category)}
                          </span>
                          <h3 className={`${styles.questionText} traditional-font`}>
                            {faq.question}
                          </h3>
                        </div>
                        <span className={`${styles.expandIcon} ${expandedFAQ === faq.id ? styles.expanded : ''}`}>
                          ▼
                        </span>
                      </button>
                      
                      {expandedFAQ === faq.id && (
                        <div 
                          id={`faq-answer-${faq.id}`}
                          className={styles.faqAnswer}
                          role="region"
                          aria-labelledby={`faq-question-${faq.id}`}
                        >
                          <p className="rounded-font">{faq.answer}</p>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>

                {filteredFAQs.length === 0 && (
                  <Alert type="info" className={styles.noResults}>
                    <p>此分類目前沒有相關問題。</p>
                  </Alert>
                )}
              </div>
            </section>
          )}

          {/* 聯絡資訊面板 */}
          {activeTab === 'contact' && (
            <section 
              id="contact-panel" 
              className={styles.tabPanel}
              role="tabpanel"
              aria-labelledby="contact-tab"
            >
              <div className={styles.contactSection}>
                <h2 className={`${styles.sectionTitle} traditional-font`}>
                  聯絡我們
                </h2>
                <p className={`${styles.sectionDescription} rounded-font`}>
                  如有任何問題，歡迎透過以下方式聯繫我們
                </p>

                <div className={styles.contactGrid}>
                  <Card className={styles.contactCard}>
                    <div className={styles.contactIcon}>🏛️</div>
                    <h3 className={`${styles.contactTitle} traditional-font`}>
                      主辦單位
                    </h3>
                    <p className={`${styles.contactInfo} rounded-font`}>
                      {contactInfo.organization}
                    </p>
                  </Card>

                  <Card className={styles.contactCard}>
                    <div className={styles.contactIcon}>📍</div>
                    <h3 className={`${styles.contactTitle} traditional-font`}>
                      地址
                    </h3>
                    <p className={`${styles.contactInfo} rounded-font`}>
                      {contactInfo.address}
                    </p>
                  </Card>

                  <Card className={styles.contactCard}>
                    <div className={styles.contactIcon}>📞</div>
                    <h3 className={`${styles.contactTitle} traditional-font`}>
                      電話
                    </h3>
                    <p className={`${styles.contactInfo} rounded-font`}>
                      <a href={`tel:${contactInfo.phone}`}>
                        {contactInfo.phone}
                      </a>
                    </p>
                  </Card>

                  <Card className={styles.contactCard}>
                    <div className={styles.contactIcon}>✉️</div>
                    <h3 className={`${styles.contactTitle} traditional-font`}>
                      電子郵件
                    </h3>
                    <p className={`${styles.contactInfo} rounded-font`}>
                      <a href={`mailto:${contactInfo.email}`}>
                        {contactInfo.email}
                      </a>
                    </p>
                  </Card>

                  <Card className={styles.contactCard}>
                    <div className={styles.contactIcon}>💬</div>
                    <h3 className={`${styles.contactTitle} traditional-font`}>
                      LINE 官方帳號
                    </h3>
                    <p className={`${styles.contactInfo} rounded-font`}>
                      {contactInfo.lineId}
                    </p>
                  </Card>

                  <Card className={styles.contactCard}>
                    <div className={styles.contactIcon}>🕐</div>
                    <h3 className={`${styles.contactTitle} traditional-font`}>
                      服務時間
                    </h3>
                    <p className={`${styles.contactInfo} rounded-font`}>
                      {contactInfo.office_hours}
                    </p>
                  </Card>
                </div>

                <Alert type="info" className={styles.emergencyContact}>
                  <h4 className="traditional-font">活動當日緊急聯絡</h4>
                  <p className="rounded-font">
                    如在活動當日遇到緊急狀況，請撥打：
                    <a href={`tel:0912-345-678`} className={styles.emergencyPhone}>
                      {contactInfo.emergency_contact}
                    </a>
                  </p>
                </Alert>
              </div>
            </section>
          )}
        </main>

        <footer className={styles.pageFooter}>
          <Button
            variant="primary"
            onClick={handleBackToHome}
            className={styles.homeButton}
          >
            返回首頁
          </Button>
        </footer>
      </div>
    </>
  );
}