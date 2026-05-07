import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export interface CallData {
  id: string;
  callerId: string;
  status: 'calling' | 'accepted' | 'rejected' | 'ended';
  offer?: any;
  answer?: any;
}

export function useCall(matchId: string) {
  const [activeCall, setActiveCall] = useState<CallData | null>(null);

  useEffect(() => {
    if (!matchId) return;

    const q = query(
      collection(db, 'matches', matchId, 'calls'),
      where('status', 'in', ['calling', 'accepted']),
      limit(1)
    );

    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setActiveCall({ id: snap.docs[0].id, ...snap.docs[0].data() } as CallData);
      } else {
        setActiveCall(null);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `matches/${matchId}/calls`);
    });

    return () => unsub();
  }, [matchId]);

  return { activeCall };
}
