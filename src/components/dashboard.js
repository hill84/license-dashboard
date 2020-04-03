import Papa from 'papaparse';
import React, { useCallback, useEffect, useState } from 'react';
import { licenseRef, licensesRef, requestRef, requestsRef } from '../firebase';
import styles from './dashboard.module.css';

const unsub = {
  fetchRequests: null,
  fetchLicenses: null
};

const operatingSystems = ['windows', 'android', 'ios'];
const devices = ['0001', '0002', '0003', '0004', '0005', '0006', '0007', '0008', '0009'];

const Dashboard = () => {
  const [licenses, setLicenses] = useState(null);
  const [requests, setRequests] = useState(null);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingLicenses, setLoadingLicenses] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const fetchRequests = useCallback(() => {
    setLoadingRequests(true);
    unsub.fetchRequests = requestsRef.orderBy('request_date', 'asc').onSnapshot(snap => {
      if (!snap.empty) {
        const items = [];
        snap.forEach(doc => items.push(doc.data()));
        setRequests(items);
      }
      setLoadingRequests(false);
    }, err => {
      console.warn(err);
      setLoadingRequests(false);
    });
  }, []);

  const fetchLicenses = useCallback(() => {
    setLoadingLicenses(true);
    unsub.fetchLicenses = licensesRef.orderBy('expire_date', 'desc').onSnapshot(snap => {
      if (!snap.empty) {
        const items = [];
        snap.forEach(doc => items.push(doc.data()));
        setLicenses(items);
      }
      setLoadingLicenses(false);
    }, err => {
      console.warn(err);
      setLoadingLicenses(false);
    });
  }, []);

  useEffect(() => {
    fetchRequests();
    fetchLicenses();
  }, [fetchLicenses, fetchRequests]);

  useEffect(() => () => {
    unsub.fetchRequests && unsub.fetchRequests();
    unsub.fetchLicenses && unsub.fetchLicenses();
  }, []);

  const onReset = () => {
    licenses.forEach(item => {
      licenseRef(item.license_id).delete().then(() => {
        setLicenses(null);
      }).catch(err => console.warn(err));
    });
  };

  const onImportCSV = useCallback(e => {
    e.preventDefault();
    const file = e.target.files[0];

    if (file) {
      setLoadingLicenses(true);
      Papa.parse(file, {
        complete: res => {
          res.data.length && res.data.forEach(item => {
            if (item.os && item.license_id && item.expire_date) {
              licensesRef.doc(item.license_id).set({ 
                ...item, 
                expire_date: Number(item.expire_date),
                assigned: false
              }).then().catch(err => console.warn(err));
            }
          });
        },
        header: true
      });
    }
    setLoadingLicenses(false);
  }, []);

  const onSelectRequest = useCallback(e => {
    e.preventDefault();
    const { rid } = e.currentTarget.dataset;
    const selectedItem = requests.filter(item => item.request_id === rid)[0];
    setSelectedRequest(selectedRequest && selectedRequest.request_id === selectedItem.request_id ? null : selectedItem);
  }, [requests, selectedRequest]);

  const onSelectLicense = useCallback(e => {
    e.preventDefault();
    const { lid } = e.currentTarget.dataset;
    const selectedItem = licenses.filter(item => item.license_id === lid)[0];

    requestRef(selectedRequest.request_id).update({
      ...selectedRequest,
      status: 'accepted',
      process_date: Date.now(),
      expire_date: Number(selectedItem.expire_date),
      license_id: lid
    }).then(() => {
      setSelectedRequest(null);
      licenseRef(lid).update({
        assigned: true
      }).catch(err => console.warn(err));
    }).catch(err => console.warn(err));

  }, [licenses, selectedRequest]);

  const onRefuse = useCallback(e => {
    e.preventDefault();
    const { rid } = e.currentTarget.parentNode.parentNode.parentNode.dataset;
    const selectedItem = requests.filter(item => item.request_id === rid)[0];

    requestRef(rid).update({
      ...selectedItem,
      status: 'refused',
      process_date: Date.now()
    }).catch(err => console.warn(err));
  }, [requests]);

  const onDeleteRequest = useCallback(e => {
    e.preventDefault();
    const { rid } = e.currentTarget.parentNode.parentNode.parentNode.dataset;
    const selectedItem = requests.filter(item => item.request_id === rid)[0];
    const { license_id: lid } = selectedItem;

    requestRef(rid).delete().then(() => {
      licenseRef(lid).update({
        assigned: false
      }).catch(err => console.warn(err));
    }).catch(err => console.warn(err));
  }, [requests]);

  const onRequest = () => {
    const docRef = requestsRef.doc();
    const os = operatingSystems[Math.floor(Math.random() * operatingSystems.length)];
    const device_id = devices[Math.floor(Math.random() * devices.length)];

    docRef.set({
      status: 'pending',
      request_date: Date.now(),
      process_date: 0,
      expire_date: 0,
      request_id: docRef.id,
      license_id: '',
      device_id,
      os
    }).then().catch(err => console.warn(err));
  };

  return (
    <div className={styles.dashboard}>
      <div className="container">
        <div className="row" style={{ padding: '15px 0' }}>
          <div className="col">
            <ul className={styles.noList}>
              <li className={styles.legend}>
                <div className="row">
                  <div className="col" title="request_id">rid</div>
                  <div className="col-1" title="device_id">did</div>
                  <div className="col-1" title="license_id">lid</div>
                  <div className="col" title="request_date">request</div>
                  <div className="col" title="process_date">process</div>
                  <div className="col" title="expire_date">expire</div>
                  <div className="col">os</div>
                  <div className="col">status</div>
                </div>
              </li>
              {loadingRequests ? (
                <li className="text-center">loading...</li>
              ) : (
                requests ? (
                  <>
                    {requests.map(item => (
                      <li
                        key={item.request_id}
                        data-status={item.status}
                        data-selected={selectedRequest && selectedRequest.request_id === item.request_id}
                        data-rid={item.request_id}
                        onClick={item.status === 'pending' ? onSelectRequest : undefined}>
                        <code className="row">
                          <div className={`${styles.absolute} ${styles.left}`}>
                            <button type="button" className="rounded" onClick={onDeleteRequest}>✖</button>
                          </div>
                          <div className="col">{item.request_id}</div>
                          <div className="col-1">{item.device_id}</div>
                          <div className="col-1">{item.license_id}</div>
                          <div className="col">{item.request_date ? new Date(item.request_date).toLocaleDateString() : ''}</div>
                          <div className="col">{item.process_date ? new Date(item.process_date).toLocaleDateString() : ''}</div>
                          <div className="col">{item.expire_date ? new Date(item.expire_date).toLocaleDateString() : ''}</div>
                          <div className="col">{item.os}</div>
                          <div className="col">{item.status}</div>
                          {selectedRequest && selectedRequest.request_id === item.request_id && (
                            <div className={`${styles.absolute} ${styles.right}`}>
                              <button type="button" className="rounded" onClick={onRefuse}>✖</button>
                            </div>
                          )}
                        </code>
                      </li>
                    ))}
                    <div className="text-center">
                      <button type="button" data-type="clear" onClick={onRequest}>New request</button>
                    </div>
                  </>
                ) : <li className="text-center">No requests</li>
              )}
            </ul>
          </div>
          <div className="col-lg-3 col-sm-12">
            <ul className={styles.noList}>
              <li className={styles.legend}>
                <div className="row">
                  <div className="col-3" title="license_id">lid</div>
                  <div className="col" title="expire_date">expire</div>
                  <div className="col">os</div>
                </div>
              </li>
              {loadingLicenses ? (
                <li className="text-center">Loading...</li>
              ) : (
                licenses ? (
                <>
                  {licenses.map(item => (
                    (!selectedRequest || (selectedRequest && selectedRequest.os === item.os && item.expire_date > Date.now() && !item.assigned)) && (
                      <li
                        key={item.license_id}
                        data-selectable={selectedRequest && selectedRequest.os === item.os}
                        data-expired={item.expire_date <= Date.now()}
                        data-assigned={item.assigned}
                        data-selected={selectedRequest && selectedRequest.license_id === item.license_id}
                        data-lid={item.license_id}
                        onClick={selectedRequest ? onSelectLicense : undefined}>
                        <div className="row mono">
                          <div className="col-3">{item.license_id}</div>
                          <div className={`col ${item.expire_date <= Date.now() ? 'text-red' : ''}`}>{item.expire_date ? new Date(Number(item.expire_date)).toLocaleDateString() : ''}</div>
                          <div className="col">{item.os}</div>
                        </div>
                      </li>
                    )
                  ))}
                  <div className="text-center">
                    <button type="button" data-type="clear" onClick={onReset}>Reset</button>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <label for="file-upload" data-type="button" className={styles.fileUpload}>Upload CSV</label>
                  <input type="file" id="file-upload" accept=".csv" onChange={onImportCSV} />
                </div>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
};

export default Dashboard;