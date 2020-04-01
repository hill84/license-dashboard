import React, { useCallback, useEffect, useState } from 'react';
import styles from './dashboard.module.css';
import { mockLicenses, mockRequests } from '../mocks/mocks';

const Dashboard = () => {
  const [licenses, setLicenses] = useState(null);
  const [requests, setRequests] = useState(null);

  useEffect(() => {
    setRequests(mockRequests);
  }, []);

  const onReset = () => setLicenses(null);

  const onUpload = () => {
    setLicenses(mockLicenses);
  };

  const onFileChange = useCallback(e => {
    e.preventDefault();
    const file = e.target.files[0];

    if (file) {
      console.log(file);
    }
  }, []);

  return (
    <div className={styles.dashboard}>
      <div className="container">
        <div className="row" style={{ padding: '15px 0' }}>
          <div className="col">
            <ul className={styles.noList}>
              {requests ? requests.map(item => (
                <li key={item.request_id}>{item.request_id}</li>
              )) : (
                <li>No requests</li>
              )}
            </ul>
          </div>
          <div className="col">
            <ul className={styles.noList}>
              {licenses ? (
                <>
                  {licenses.map(item => (
                    <li key={item.license_id}>{item.license_id}</li>
                  ))}<br />
                  <button onClick={onReset}>Reset licenses</button>
                </>
              ) : (
                <li className="text-center">
                  <input type="file" accept=".csv" onChange={onFileChange} /><br />
                  <button onClick={onUpload}>Upload CSV</button>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
};

export default Dashboard;