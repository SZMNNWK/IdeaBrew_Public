import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Animated } from 'react-native';
import { TabView, SceneMap } from 'react-native-tab-view';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import ProjectScreen from '../screens/ProjectScreen';
import SettingScreen from '../screens/SettingScreen';

const initialLayout = { width: Dimensions.get('window').width };

export default function AnimatedBottomTabView() {
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'home', title: 'Home', icon: 'home', component: HomeScreen },
    { key: 'projects', title: 'Projects', icon: 'folder', component: ProjectScreen },
    { key: 'menu', title: 'Menu', icon: 'menu', component: SettingScreen },
  ]);

  const scrollX = useRef(new Animated.Value(0)).current;
  const [tabLayouts, setTabLayouts] = useState([]);

  const renderScene = SceneMap(
    routes.reduce((acc, route) => {
      acc[route.key] = route.component;
      return acc;
    }, {})
  );

  const handleTabPress = (i) => {
    setIndex(i);
    Animated.spring(scrollX, {
      toValue: i,
      useNativeDriver: false,
      speed: 12,
      bounciness: 6,
    }).start();
  };

  const renderTabBar = () => {
    // jeśli nie mamy layoutów, nie renderujemy slidera
    const translateX = tabLayouts[index]
      ? scrollX.interpolate({
          inputRange: routes.map((_, i) => i),
          outputRange: routes.map((_, i) => tabLayouts[i].x),
        })
      : 0;

    const sliderWidth = tabLayouts[index]?.width || 0;

    return (
      <View style={styles.tabBarContainer}>
        {/* Slider */}
        {tabLayouts.length === routes.length && (
          <Animated.View
            style={[
              styles.slider,
              {
                width: sliderWidth,
                transform: [{ translateX }],
              },
            ]}
          />
        )}

        {routes.map((route, i) => {
          const isFocused = index === i;

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabItemWrapper} // flex:1 dla symetrii
              onPress={() => handleTabPress(i)}
              activeOpacity={0.8}
              onLayout={(e) => {
                const layout = e.nativeEvent.layout;
                setTabLayouts((prev) => {
                  const newLayouts = [...prev];
                  newLayouts[i] = layout;
                  return newLayouts;
                });
              }}
            >
              <View style={styles.tabItem}>
                <Ionicons name={route.icon} size={24} color={isFocused ? '#2196F3' : '#666'} />
                {isFocused && <Text style={[styles.tabLabel, { color: '#2196F3' }]}>{route.title}</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={(i) => {
          setIndex(i);
          Animated.spring(scrollX, {
            toValue: i,
            useNativeDriver: false,
            speed: 12,
            bounciness: 6,
          }).start();
        }}
        initialLayout={initialLayout}
        swipeEnabled={true}
        renderTabBar={() => null} 
      />
      {renderTabBar()}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(224,229,236,0.95)',
    borderRadius: 30,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    paddingHorizontal: 10,
  },
  slider: {
    position: 'absolute',
    bottom: 10,
    left: 0, 
    height: 40,
    backgroundColor: 'rgba(33,150,243,0.15)',
    borderRadius: 20,
  },
  tabItemWrapper: {
    flex: 1, 
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
