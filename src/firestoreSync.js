import { db } from './firebase';
import {
  doc, getDoc, setDoc, collection, onSnapshot,
} from 'firebase/firestore';

const COL = 'appdata';

function stateToFirestore(state) {
  return {
    projects:   { items: state.projects   || [] },
    weeks:      { items: state.weeks      || [] },
    weekData:   { data:  state.weekData   || {} },
    team:       { items: state.team       || [] },
    changelog:  { items: state.changeLog  || [] },
    okrScores:  { data:  state.okrScores  || {} },
    quarters:   { items: state.quarters   || [] },
    objectives: { items: state.objectives || [] },
  };
}

export function firestoreToState(docs) {
  return {
    projects:   docs.projects?.items   || [],
    weeks:      docs.weeks?.items      || [],
    weekData:   docs.weekData?.data    || {},
    team:       docs.team?.items       || [],
    changeLog:  docs.changelog?.items  || [],
    okrScores:  docs.okrScores?.data   || {},
    quarters:   docs.quarters?.items   || [],
    objectives: docs.objectives?.items || [],
  };
}

export async function pullFromFirestore() {
  const keys = ['projects', 'weeks', 'weekData', 'team', 'changelog', 'okrScores', 'quarters', 'objectives'];
  const snaps = await Promise.all(keys.map(k => getDoc(doc(db, COL, k))));
  const docs  = {};
  keys.forEach((k, i) => { docs[k] = snaps[i].exists() ? snaps[i].data() : null; });
  return firestoreToState(docs);
}

export async function pushToFirestore(state) {
  const data = stateToFirestore(state);
  await Promise.all(
    Object.entries(data).map(([k, v]) => setDoc(doc(db, COL, k), v))
  );
}

export function listenToFirestore(callback) {
  return onSnapshot(collection(db, COL), (snapshot) => {
    if (snapshot.metadata.hasPendingWrites) return;
    const docs = {};
    snapshot.forEach(d => { docs[d.id] = d.data(); });
    callback(firestoreToState(docs));
  });
}
