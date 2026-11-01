import { StyleSheet } from 'react-native';

// Styles propres à la carte, au tracé d’activité et à son curseur.
export default StyleSheet.create({
  map: {
    flex: 1,
  },
  trackCursorMarker: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: '#dc2626',
    elevation: 4,
  },
});
