import { StyleSheet } from 'react-native';

// Styles de la liste d’activités Garmin et de ses contrôles.
export default StyleSheet.create({
  activitiesContainer: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  activitiesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activitiesToggle: {
    flex: 1,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activitiesToggleText: {
    flex: 1,
    color: '#222',
    fontWeight: '600',
  },
  activitiesChevron: {
    marginLeft: 10,
    color: '#2563eb',
    fontSize: 20,
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  refreshButtonText: {
    color: '#2563eb',
    fontSize: 22,
  },
  activitiesList: {
    maxHeight: 240,
    marginTop: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  activityDateSearch: {
    minHeight: 40,
    marginTop: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
    color: '#222',
    fontSize: 14,
  },
  activityItem: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  activityDate: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '600',
  },
  activityName: {
    marginTop: 3,
    color: '#222',
  },
  emptyActivities: {
    paddingVertical: 12,
    color: '#555',
  },
  activitiesMessage: {
    marginTop: 6,
    color: '#b42318',
    fontSize: 13,
  },
});
