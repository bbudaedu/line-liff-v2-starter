import React from 'react';
import { NextPageContext } from 'next';
import Head from 'next/head';
import { ErrorPage } from '../components/error/ErrorPage';

interface ErrorProps {
  statusCode?: number;
  hasGetInitialPropsRun?: boolean;
  err?: Error;
}

function Error({ statusCode, err }: ErrorProps) {
  const getTitle = (statusCode?: number) => {
    switch (statusCode) {
      case 404:
        return '頁面不存在';
      case 500:
        return '伺服器錯誤';
      default:
        return '系統錯誤';
    }
  };

  return (
    <>
      <Head>
        <title>{getTitle(statusCode)} - 彰化供佛齋僧活動報名系統</title>
        <meta name="description" content="系統發生錯誤" />
      </Head>
      <ErrorPage 
        statusCode={statusCode}
        error={err}
        onHome={() => window.location.href = '/'}
      />
    </>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  
  // Log error on server side
  if (err && typeof window === 'undefined') {
    console.error('Server-side error:', {
      message: err.message,
      stack: err.stack,
      statusCode,
      timestamp: new Date().toISOString()
    });
  }
  
  return { statusCode, err };
};

export default Error;