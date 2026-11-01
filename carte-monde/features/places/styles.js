import { StyleSheet } from 'react-native';

// Styles du champ de recherche et de son retour d’état.
export default StyleSheet.create({
  searchContainer: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: 44,
    paddingHorizontal: 12,
    color: '#222',
  },
  searchButton: {
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  disabledButton: {
    opacity: 0.6,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  searchMessage: {
    marginTop: 8,
    color: '#b42318',
    fontSize: 13,
  },
});
