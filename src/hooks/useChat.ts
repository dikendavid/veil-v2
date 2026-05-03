import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Message, UserProfile } from '../types';

export function useChat(matchId: string, currentUser: UserProfile) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId) return;

    const q = query(
      collection(db, 'matches', matchId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ 
        ...d.data(), 
        id: d.id,
        createdAt: d.data().createdAt?.toDate()?.toISOString() || new Date().toISOString()
      } as Message)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `matches/${matchId}/messages`);
      setLoading(false);
    });

    return () => unsub();
  }, [matchId]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    try {
      await addDoc(collection(db, 'matches', matchId, 'messages'), {
        senderId: currentUser.uid,
        text,
        createdAt: serverTimestamp(),
        isRead: false
      });

      // Update match preview
      await setDoc(doc(db, 'matches', matchId), {
        lastMessage: text,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `matches/${matchId}/messages`);
    }
  }, [matchId, currentUser.uid]);

  return { messages, loading, sendMessage };
}
