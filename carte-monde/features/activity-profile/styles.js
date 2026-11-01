import { StyleSheet } from 'react-native';

// Styles du panneau de profil et de ses graphiques.
export default StyleSheet.create({
  elevationPanel: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 24,
    zIndex: 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#fff',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  elevationHeader: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
  },
  elevationHeaderText: {
    flex: 1,
  },
  elevationTitle: {
    color: '#222',
    fontSize: 15,
    fontWeight: '700',
  },
  elevationSubtitle: {
    marginTop: 2,
    color: '#666',
    fontSize: 12,
  },
  elevationChevron: {
    marginLeft: 12,
    color: '#2563eb',
    fontSize: 22,
  },
  elevationContent: {
    paddingTop: 8,
  },
  elevationChartRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  elevationAxis: {
    position: 'relative',
    width: 46,
    height: 112,
  },
  elevationAxisLabel: {
    position: 'absolute',
    left: 0,
    color: '#666',
    fontSize: 10,
    lineHeight: 12,
    includeFontPadding: false,
  },
  elevationChart: {
    flex: 1,
    height: 112,
    overflow: 'hidden',
  },
  distanceAxisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  elevationDistanceSpacer: {
    width: 46,
  },
  performanceDistanceSpacer: {
    width: 32,
  },
  distanceTickTrack: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  distanceTickLabel: {
    color: '#666',
    fontSize: 9,
    lineHeight: 11,
    includeFontPadding: false,
  },
  selectedPointLabel: {
    marginTop: 2,
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  performanceSection: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  performanceLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  performanceLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  performanceLegendLine: {
    width: 12,
    height: 3,
    marginRight: 4,
    borderRadius: 2,
  },
  performanceLegendText: {
    color: '#555',
    fontSize: 10,
  },
  performanceChartRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  performanceAxis: {
    width: 46,
    height: 88,
    justifyContent: 'space-between',
  },
  performanceRightAxis: {
    width: 32,
    height: 88,
    justifyContent: 'space-between',
  },
  performanceAxisLabel: {
    color: '#666',
    fontSize: 9,
    lineHeight: 11,
    includeFontPadding: false,
  },
  performanceChart: {
    flex: 1,
    height: 88,
    overflow: 'hidden',
  },
  performanceSelectedLabel: {
    marginTop: 2,
    color: '#555',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
  elevationMessage: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  elevationMessageText: {
    color: '#666',
    fontSize: 13,
  },
  elevationError: {
    color: '#b42318',
    fontSize: 13,
  }
});
