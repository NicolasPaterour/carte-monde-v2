import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import styles from './styles';

// Recherche une ville via Nominatim et transmet au parent ses coordonnées.
export default function PlaceSearchPanel({ onPlaceSelected }) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');

  const searchPlace = async () => {
    const searchQuery = query.trim();
    if (!searchQuery || isSearching) {
      return;
    }

    setIsSearching(true);
    setSearchMessage('');

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'CarteMonde/1.0',
          },
        }
      );
      if (!response.ok) {
        throw new Error(`La recherche a échoué (${response.status}).`);
      }

      const results = await response.json();
      if (!Array.isArray(results) || results.length === 0) {
        setSearchMessage('Aucun lieu trouvé. Essayez un autre nom.');
        return;
      }

      const result = results[0];
      const latitude = Number(result?.lat);
      const longitude = Number(result?.lon);
      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        setSearchMessage('Coordonnées invalides pour ce lieu.');
        return;
      }

      onPlaceSelected({
        latitude,
        longitude,
        title: searchQuery,
        description: result.display_name,
      });
    } catch (error) {
      setSearchMessage(
        error instanceof Error
          ? error.message
          : 'Impossible de rechercher ce lieu. Vérifiez votre connexion.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchRow}>
        <TextInput
          accessibilityLabel="Rechercher un lieu"
          style={styles.searchInput}
          placeholder="Rechercher une ville, un lieu..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={searchPlace}
          returnKeyType="search"
          clearButtonMode="while-editing"
          editable={!isSearching}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Rechercher"
          style={[styles.searchButton, isSearching && styles.disabledButton]}
          onPress={searchPlace}
          disabled={isSearching || !query.trim()}
        >
          {isSearching ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.searchButtonText}>Rechercher</Text>
          )}
        </Pressable>
      </View>
      {!!searchMessage && <Text style={styles.searchMessage}>{searchMessage}</Text>}
    </View>
  );
}
