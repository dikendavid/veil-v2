import { useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Match } from '../types';

export function useNotifications(userId?: string) {
  const isFirstRun = useRef(true);
  const notifiedMatches = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;

    // Request permission if not already granted or denied
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(console.error);
    }

    const q = query(
      collection(db, 'matches'),
      where('users', 'array-contains', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Initialize the set of already mutual matches on first run
      if (isFirstRun.current) {
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data() as Match;
          if (data.isMutual) {
            notifiedMatches.current.add(data.id);
          }
        });
        isFirstRun.current = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const data = change.doc.data() as Match;
          
          if (data.isMutual && !notifiedMatches.current.has(data.id)) {
             notifiedMatches.current.add(data.id);

             if ('Notification' in window && Notification.permission === 'granted') {
               const otherUser = data.participants?.find((p) => p.uid !== userId);
               const otherName = otherUser?.displayName || 'Someone';

               new Notification('New Secure Connection', {
                 body: `You and ${otherName} have a mutual match.`,
               });
             }
          }
        }
      });
    }, (error) => {
      console.error(error);
    });

    return () => unsubscribe();
  }, [userId]);
}
