import { useEffect, useState, useRef } from 'react';
import { Phone, RefreshCw, CheckCircle } from 'lucide-react';
import api from '../services/api';
import QRCode from 'qrcode';

export default function WhatsApp() {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrImage, setQrImage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const isPolling = useRef(false);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(() => {
      if (!isPolling.current) checkStatus();
    }, 3000);
    return () => {
      clearInterval(interval);
      isPolling.current = false;
    };
  }, []);

  useEffect(() => {
    if (qrCode) {
      isPolling.current = true;
      QRCode.toDataURL(qrCode, { width: 300, margin: 2 })
        .then((url) => setQrImage(url))
        .finally(() => { isPolling.current = false; });
    } else {
      setQrImage('');
    }
  }, [qrCode]);

  const checkStatus = async () => {
    try {
      const { data } = await api.get('/whatsapp/status');
      setStatus(data.status);
      setQrCode(data.qrCode ?? null);
    } catch {}
  };

  const connect = async () => {
    setLoading(true);
    setQrCode(null);
    setQrImage('');
    try {
      await api.post('/whatsapp/connect');
    } catch {
      alert('Failed to connect');
    }
    setLoading(false);
    checkStatus();
  };

  const disconnect = async () => {
    if (!confirm('Disconnect WhatsApp?')) return;
    try {
      await api.post('/whatsapp/disconnect');
      setStatus('disconnected');
      setQrCode(null);
    } catch {}
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">WhatsApp Connection</h1>

      <div className="max-w-md mx-auto">
        <div className="bg-white p-6 rounded-xl shadow text-center">
          <div className="flex justify-center mb-6">
            {status === 'connected' ? (
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle size={40} className="text-green-600" />
              </div>
            ) : (
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                <Phone size={40} className="text-slate-400" />
              </div>
            )}
          </div>

          <h2 className="text-xl font-semibold mb-2">
            {status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting...' : 'Not Connected'}
          </h2>
          <p className="text-slate-500 mb-6">
            {status === 'connected'
              ? 'Your WhatsApp is connected and ready to send messages'
              : 'Connect your WhatsApp to start sending messages to tenants'}
          </p>

          {status === 'connected' ? (
            <button onClick={disconnect} className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700">
              Disconnect
            </button>
          ) : (
            <button
              onClick={connect}
              disabled={loading || status === 'connecting'}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-slate-300"
            >
              {loading || status === 'connecting' ? 'Connecting...' : 'Connect WhatsApp'}
            </button>
          )}
        </div>

        {qrCode && status === 'connecting' && (
          <div className="mt-6 bg-white p-6 rounded-xl shadow text-center">
            <h3 className="text-lg font-semibold mb-4">Scan QR Code</h3>
            <p className="text-sm text-slate-500 mb-4">
              Open WhatsApp on your phone, tap Menu or Settings and select Linked Devices. Then tap Link a Device.
            </p>
            <div className="flex justify-center">
              <div className="bg-white p-4 border-2 border-slate-200 rounded-lg">
                {qrImage ? (
                  <img src={qrImage} alt="WhatsApp QR Code" className="w-60 h-60" />
                ) : (
                  <div className="w-60 h-60 flex items-center justify-center text-slate-400">
                    <RefreshCw size={32} className="animate-spin" />
                  </div>
                )}
              </div>
            </div>
            <button onClick={checkStatus} className="mt-4 flex items-center gap-2 mx-auto text-blue-600 hover:underline">
              <RefreshCw size={16} /> Refresh Status
            </button>
          </div>
        )}

        <div className="mt-6 bg-blue-50 p-4 rounded-xl">
          <h4 className="font-medium text-blue-900 mb-2">Tips:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>Keep your phone connected to the internet</li>
            <li>Scan the QR code within 60 seconds</li>
            <li>Session persists even after app restart</li>
            <li>Maximum 20 messages per minute to avoid ban</li>
          </ul>
        </div>
      </div>
    </div>
  );
}