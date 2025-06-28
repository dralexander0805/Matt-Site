import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import {
  getFirestore,
  collection,
  query,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import {
  getAuth,
  onAuthStateChanged,
  signInWithCustomToken,
  signInAnonymously,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyAXh_Vc8dj3vqPhWWHgM4i70ArqeYfDJXA',
  authDomain: 'flight-ad3eb.firebaseapp.com',
  projectId: 'flight-ad3eb',
  storageBucket: 'flight-ad3eb.appspot.com', // Fixed here
  messagingSenderId: '221626771101',
  appId: '1:221626771101:web:47e86ba13083a01c57d674',
  measurementId: 'G-9C6GW1LKGV',
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

// If you want to customize this appId elsewhere, change here:
const appId = 'flight-ad3eb';

const CustomModal = ({ message, onConfirm, onCancel, showCancel = false }) => {
  if (!message) return null;
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-auto transform transition-all scale-100 opacity-100">
        <p className="text-gray-800 text-lg mb-6 text-center">{message}</p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition ease-in-out duration-150"
          >
            OK
          </button>
          {showCancel && (
            <button
              onClick={onCancel}
              className="px-6 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition ease-in-out duration-150"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const App = () => {
  // States
  const [userId, setUserId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  const [flights, setFlights] = useState([]);
  const [editingFlight, setEditingFlight] = useState(null);
  const [showFlightForm, setShowFlightForm] = useState(false);
  const [userDisplayNameMap, setUserDisplayNameMap] = useState({});

  const [flightNumber, setFlightNumber] = useState('');
  const [departure, setDeparture] = useState('');
  const [arrival, setArrival] = useState('');
  const [departureTime, setDepartureTime] = useState('');

  const [modalMessage, setModalMessage] = useState('');
  const [modalOnConfirm, setModalOnConfirm] = useState(() => {});
  const [modalOnCancel, setModalOnCancel] = useState(() => {});
  const [showModalCancel, setShowModalCancel] = useState(false);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      let currentUserId = '';
      if (user) {
        currentUserId = user.uid;
      } else {
        try {
          await signInAnonymously(auth);
          currentUserId = auth.currentUser.uid;
        } catch (error) {
          console.error('Authentication error:', error);
          showCustomModal('Authentication failed. Please try again.', () => {});
          setIsAuthReady(true);
          return;
        }
      }
      setUserId(currentUserId);

      try {
        const userProfileRef = doc(
          db,
          'artifacts',
          appId,
          'public',
          'data',
          'userProfiles',
          currentUserId
        );
        const profileSnap = await getDoc(userProfileRef);
        if (profileSnap.exists() && profileSnap.data().displayName) {
          setDisplayName(profileSnap.data().displayName);
        } else {
          setDisplayName(currentUserId.substring(0, 8));
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        showCustomModal('Failed to load user profile.', () => {});
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // Fetch flights and user names
  useEffect(() => {
    if (!isAuthReady || !userId) return;

    const flightsCollectionRef = collection(
      db,
      `artifacts/${appId}/public/data/flights`
    );
    const q = query(flightsCollectionRef);

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const fetchedFlights = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        fetchedFlights.sort((a, b) =>
          a.flightNumber.localeCompare(b.flightNumber)
        );
        setFlights(fetchedFlights);

        const allUids = new Set();
        fetchedFlights.forEach((flight) => {
          if (flight.signedUpUsers) {
            flight.signedUpUsers.forEach((uid) => allUids.add(uid));
          }
        });

        const newMap = { ...userDisplayNameMap };
        const userProfilesCollectionRef = collection(
          db,
          `artifacts/${appId}/public/data/userProfiles`
        );

        await Promise.all(
          Array.from(allUids).map(async (uid) => {
            if (!newMap[uid]) {
              const profileDocRef = doc(userProfilesCollectionRef, uid);
              const profileSnap = await getDoc(profileDocRef);
              newMap[uid] =
                profileSnap.exists() && profileSnap.data().displayName
                  ? profileSnap.data().displayName
                  : uid.substring(0, 8);
            }
          })
        );

        setUserDisplayNameMap(newMap);
      },
      (error) => {
        console.error('Error fetching flights:', error);
        showCustomModal(
          'Failed to load flights. Please try refreshing.',
          () => {}
        );
      }
    );

    return () => unsubscribe();
  }, [isAuthReady, userId]);

  const showCustomModal = (
    message,
    onConfirm,
    showCancel = false,
    onCancel = () => {}
  ) => {
    setModalMessage(message);
    setModalOnConfirm(() => () => {
      onConfirm();
      setModalMessage('');
    });
    setShowModalCancel(showCancel);
    setModalOnCancel(() => () => {
      onCancel();
      setModalMessage('');
    });
  };

  const handleSaveDisplayName = async () => {
    if (!displayName.trim()) {
      showCustomModal('Callsign cannot be empty.', () => {});
      return;
    }
    if (!userId) {
      showCustomModal('User not authenticated. Please wait.', () => {});
      return;
    }
    try {
      const userProfileRef = doc(
        db,
        'artifacts',
        appId,
        'public',
        'data',
        'userProfiles',
        userId
      );
      await setDoc(userProfileRef, { displayName: displayName.trim() });
      showCustomModal('Callsign saved successfully!', () => {});
      setUserDisplayNameMap((prev) => ({
        ...prev,
        [userId]: displayName.trim(),
      }));
    } catch (error) {
      console.error('Error saving display name:', error);
      showCustomModal(`Failed to save callsign: ${error.message}`, () => {});
    }
  };

  const handleAdminLogin = () => {
    const correctPin = '54321';
    if (adminPinInput === correctPin) {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminPinInput('');
      showCustomModal('Administrator access granted!', () => {});
    } else {
      showCustomModal('Incorrect PIN. Please try again.', () => {});
      setAdminPinInput('');
    }
  };

  const handleSubmitFlight = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      showCustomModal(
        'Only administrators can add or edit flights. Please log in as admin.',
        () => {}
      );
      return;
    }
    if (!flightNumber || !departure || !arrival || !departureTime) {
      showCustomModal('All fields are required.', () => {});
      return;
    }
    const flightData = {
      flightNumber,
      departure,
      arrival,
      departureTime,
      signedUpUsers: editingFlight ? editingFlight.signedUpUsers : [],
    };

    try {
      if (editingFlight) {
        const flightDocRef = doc(
          db,
          `artifacts/${appId}/public/data/flights`,
          editingFlight.id
        );
        await updateDoc(flightDocRef, flightData);
        showCustomModal('Flight updated successfully!', () => {});
      } else {
        await addDoc(
          collection(db, `artifacts/${appId}/public/data/flights`),
          flightData
        );
        showCustomModal('Flight added successfully!', () => {});
      }
      // Reset form
      setFlightNumber('');
      setDeparture('');
      setArrival('');
      setDepartureTime('');
      setEditingFlight(null);
      setShowFlightForm(false);
    } catch (error) {
      console.error('Error saving flight:', error);
      showCustomModal(`Failed to save flight: ${error.message}`, () => {});
    }
  };

  const handleEditClick = (flight) => {
    if (!isAdmin) {
      showCustomModal(
        'Only administrators can edit flights. Please log in as admin.',
        () => {}
      );
      return;
    }
    setEditingFlight(flight);
    setFlightNumber(flight.flightNumber);
    setDeparture(flight.departure);
    setArrival(flight.arrival);
    setDepartureTime(flight.departureTime || '');
    setShowFlightForm(true);
  };

  const handleDeleteFlight = (flightId) => {
    if (!isAdmin) {
      showCustomModal(
        'Only administrators can delete flights. Please log in as admin.',
        () => {}
      );
      return;
    }
    showCustomModal(
      'Are you sure you want to delete this flight?',
      async () => {
        try {
          await deleteDoc(
            doc(db, `artifacts/${appId}/public/data/flights`, flightId)
          );
          showCustomModal('Flight deleted successfully!', () => {});
        } catch (error) {
          console.error('Error deleting flight:', error);
          showCustomModal(
            `Failed to delete flight: ${error.message}`,
            () => {}
          );
        }
      },
      true,
      () => {}
    );
  };

  const handleToggleSignup = async (flightId, signedUpUsers) => {
    if (!userId) {
      showCustomModal(
        'Please wait, authentication is not ready yet.',
        () => {}
      );
      return;
    }
    const flightDocRef = doc(
      db,
      `artifacts/${appId}/public/data/flights`,
      flightId
    );
    const isSignedUp = signedUpUsers.includes(userId);
    const updatedUsers = isSignedUp
      ? signedUpUsers.filter((id) => id !== userId)
      : [...signedUpUsers, userId];
    try {
      await updateDoc(flightDocRef, { signedUpUsers: updatedUsers });
      showCustomModal(
        `You have successfully ${
          isSignedUp ? 'unsigned up from' : 'signed up for'
        } this flight!`,
        () => {}
      );
    } catch (error) {
      console.error('Error updating signup status:', error);
      showCustomModal(
        `Failed to update signup status: ${error.message}`,
        () => {}
      );
    }
  };

  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 font-sans">
        <p className="text-gray-700 text-lg">Loading application...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8 font-sans flex flex-col items-center">
      <CustomModal
        message={modalMessage}
        onConfirm={modalOnConfirm}
        onCancel={modalOnCancel}
        showCancel={showModalCancel}
      />

      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg p-6 sm:p-8">
        <div className="mb-6 flex justify-center">
          <img
            src="https://i.imgur.com/Lwd3LxD.png"
            alt="ZID FSExpo Cargo Runs Banner"
            className="rounded-lg shadow-md w-full max-w-md h-auto object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src =
                'https://placehold.co/600x150/F8F8F8/333333?text=Image+Load+Error%0AProvide+Full+URL';
            }}
          />
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-center text-gray-800 mb-6">
          ZID FSExpo Cargo Runs
        </h1>

        {/* User Profile */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-8 text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Your Profile
          </h2>
          <p className="text-gray-600 mb-4">
            Your unique Firebase User ID:{' '}
            <span className="font-mono bg-gray-200 px-2 py-1 rounded text-sm break-all">
              {userId}
            </span>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="flex-grow max-w-xs sm:max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center sm:text-left"
              placeholder="Set your callsign (e.g., CARGO777)"
              aria-label="Your Callsign"
            />
            <button
              onClick={handleSaveDisplayName}
              className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition duration-150 ease-in-out"
            >
              Save Callsign
            </button>
          </div>
        </div>

        {/* Admin Login / Add Flight Buttons */}
        <div className="mb-6 text-center">
          {!isAdmin ? (
            <button
              onClick={() => setShowAdminLogin(!showAdminLogin)}
              className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75 transition duration-150 ease-in-out mr-2"
            >
              {showAdminLogin ? 'Cancel Admin Login' : 'Admin Login'}
            </button>
          ) : (
            <button
              onClick={() => setIsAdmin(false)}
              className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 transition duration-150 ease-in-out mr-2"
            >
              Logout Admin
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => {
                setShowFlightForm(!showFlightForm);
                if (showFlightForm) {
                  setEditingFlight(null);
                  setFlightNumber('');
                  setDeparture('');
                  setArrival('');
                  setDepartureTime('');
                }
              }}
              className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 transition duration-150 ease-in-out"
            >
              {showFlightForm ? 'Cancel Add/Edit Flight' : 'Add New Flight'}
            </button>
          )}
        </div>

        {/* Admin PIN Login Form */}
        {!isAdmin && showAdminLogin && (
          <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-8 text-center">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Enter Admin PIN
            </h2>
            <input
              type="password"
              value={adminPinInput}
              onChange={(e) => setAdminPinInput(e.target.value)}
              className="mb-4 block w-full sm:w-64 mx-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 text-center"
              placeholder="Enter PIN"
            />
            <button
              onClick={handleAdminLogin}
              className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75 transition duration-150 ease-in-out"
            >
              Login
            </button>
          </div>
        )}

        {/* Add/Edit Flight Form */}
        {isAdmin && showFlightForm && (
          <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-8">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              {editingFlight ? 'Edit Flight' : 'Add New Flight'}
            </h2>
            <form
              onSubmit={handleSubmitFlight}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div>
                <label
                  htmlFor="flightNumber"
                  className="block text-sm font-medium text-gray-700"
                >
                  Flight #
                </label>
                <input
                  type="text"
                  id="flightNumber"
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value)}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="departure"
                  className="block text-sm font-medium text-gray-700"
                >
                  Departure
                </label>
                <input
                  type="text"
                  id="departure"
                  value={departure}
                  onChange={(e) => setDeparture(e.target.value)}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="arrival"
                  className="block text-sm font-medium text-gray-700"
                >
                  Arrival
                </label>
                <input
                  type="text"
                  id="arrival"
                  value={arrival}
                  onChange={(e) => setArrival(e.target.value)}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="departureTime"
                  className="block text-sm font-medium text-gray-700"
                >
                  Departure Time (Local)
                </label>
                <input
                  type="time"
                  id="departureTime"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2 text-center mt-4">
                <button
                  type="submit"
                  className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75 transition duration-150 ease-in-out"
                >
                  {editingFlight ? 'Save Changes' : 'Add Flight'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Flights List */}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg shadow-md">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="py-3 px-4 text-left">Flight #</th>
                <th className="py-3 px-4 text-left">Departure</th>
                <th className="py-3 px-4 text-left">Arrival</th>
                <th className="py-3 px-4 text-left">Dep Time</th>
                <th className="py-3 px-4 text-left">Signed Up Pilots</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {flights.map((flight) => {
                const signedUpUsers = flight.signedUpUsers || [];
                const isUserSignedUp = signedUpUsers.includes(userId);
                return (
                  <tr key={flight.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4">{flight.flightNumber}</td>
                    <td className="py-2 px-4">{flight.departure}</td>
                    <td className="py-2 px-4">{flight.arrival}</td>
                    <td className="py-2 px-4">{flight.departureTime}</td>
                    <td className="py-2 px-4 max-w-xs overflow-auto text-sm">
                      {signedUpUsers.length > 0
                        ? signedUpUsers
                            .map(
                              (uid) =>
                                userDisplayNameMap[uid] || uid.substring(0, 8)
                            )
                            .join(', ')
                        : 'No signups yet'}
                    </td>
                    <td className="py-2 px-4 text-center space-x-2">
                      <button
                        onClick={() =>
                          handleToggleSignup(flight.id, signedUpUsers)
                        }
                        className={`px-3 py-1 rounded-md text-white font-semibold ${
                          isUserSignedUp
                            ? 'bg-red-500 hover:bg-red-600'
                            : 'bg-green-600 hover:bg-green-700'
                        } focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-500 focus:ring-opacity-75`}
                      >
                        {isUserSignedUp ? 'Unsign' : 'Sign Up'}
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => handleEditClick(flight)}
                            className="px-3 py-1 bg-yellow-500 rounded-md text-white font-semibold hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-75"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteFlight(flight.id)}
                            className="px-3 py-1 bg-red-600 rounded-md text-white font-semibold hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              {flights.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-gray-500">
                    No flights available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default App;
