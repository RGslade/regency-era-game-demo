import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { appStyles as styles } from '../styles/appStyles';

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isWordToken = (value) => /^[A-Za-z0-9 ]+$/.test(value);
const splitByNames = (text, nameColors, placeColors) => {
  const names = Object.keys(nameColors || {});
  const places = Object.keys(placeColors || {});
  if (!text || (names.length === 0 && places.length === 0)) {
    return [{ text, color: null, backgroundColor: null }];
  }
  const tokens = [...names, ...places].filter(Boolean);
  if (tokens.length === 0) {
    return [{ text, color: null, backgroundColor: null }];
  }
  const nameColorByToken = Object.fromEntries(
    Object.entries(nameColors || {}).map(([token, color]) => [token.toLowerCase(), color])
  );
  const placeColorByToken = Object.fromEntries(
    Object.entries(placeColors || {}).map(([token, color]) => [token.toLowerCase(), color])
  );
  const pattern = tokens
    .sort((a, b) => b.length - a.length)
    .map((token) => {
      const escaped = escapeRegExp(token);
      return isWordToken(token) ? `\\b${escaped}\\b` : escaped;
    })
    .join('|');
  if (!pattern) {
    return [{ text, color: null, backgroundColor: null }];
  }
  const regex = new RegExp(`(${pattern})`, 'gi');
  const parts = [];
  let lastIndex = 0;
  let match = regex.exec(text);
  while (match) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), color: null, backgroundColor: null });
    }
    const token = match[0];
    const normalizedToken = token.toLowerCase();
    const backgroundColor = placeColorByToken[normalizedToken] || null;
    const color = backgroundColor ? colors.text : nameColorByToken[normalizedToken] || null;
    parts.push({ text: token, color, backgroundColor });
    lastIndex = match.index + match[0].length;
    match = regex.exec(text);
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), color: null, backgroundColor: null });
  }
  return parts;
};

export const MessageBubble = ({ message, onTypingComplete, onLayout, skipSignal, textSize = 15, fontFamily = 'serif', messageCount }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const typingLoopRef = useRef(null);
  const typingIntervalRef = useRef(null);
  const messageText = message?.text ?? '';
  const [visibleText, setVisibleText] = useState(
    message.type === 'game' && message.animate ? '' : messageText
  );
  const skipVersionRef = useRef(skipSignal);
  const msgCount = useRef(messageCount);

  // Fade and slide the bubble in on mount.
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  // Render a typing effect for new game narration.
  useEffect(() => {
    if (message.type !== 'game' || !message.animate) {
      setVisibleText(messageText);
      textOpacity.setValue(1);
      return undefined;
    }

    let currentIndex = 0;
    setVisibleText('');
    // Pulse the text while the typing effect reveals characters.
    typingLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(textOpacity, {
          toValue: 0.7,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ])
    );
    typingLoopRef.current.start();
    const intervalId = setInterval(() => {
      currentIndex += 1;
      setVisibleText(messageText.slice(0, currentIndex));
      if (currentIndex >= messageText.length) {
        clearInterval(intervalId);
        typingIntervalRef.current = null;
        typingLoopRef.current?.stop();
        textOpacity.setValue(1);
        onTypingComplete?.(message.id);
      }
    }, 8);
    typingIntervalRef.current = intervalId;

    return () => {
      clearInterval(intervalId);
      typingIntervalRef.current = null;
      typingLoopRef.current?.stop();
    };
  }, [message.id, messageText, message.type, message.animate, onTypingComplete, textOpacity]);

  useEffect(() => {
    if (skipSignal === skipVersionRef.current) {
      return;
    }
    skipVersionRef.current = skipSignal;
    if (message.type === 'game' && message.animate) {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
      typingLoopRef.current?.stop();
      textOpacity.setValue(1);
      setVisibleText(messageText);
      onTypingComplete?.(message.id);
    }
  }, [skipSignal, message.animate, message.id, messageText, message.type, onTypingComplete, textOpacity]);

  // Build coloured spans once per message update.
  const highlightedText = useMemo(
    () => splitByNames(visibleText, message.nameColors, message.placeColors),
    [message.nameColors, message.placeColors, visibleText]
  );

  return (
    <Animated.View onLayout={onLayout} 
    style={[styles.message, message.type === 'user' ? styles.messageUser : styles.messageGame,
        { opacity, transform: [{ translateY }] },
      ]}>
      {message.type === 'user' ? (
        <Text style={styles.choiceArchiveLabel}>Your choice</Text>
      ) : (
        <>
          {msgCount > 0 && <View style={styles.storyEntryRule} />}
        </>
      )}
      <Animated.Text style={[styles.messageText, { opacity: textOpacity, fontSize: textSize, fontFamily }]}>
        {highlightedText.map((segment, index) => (
          <Text key={`${message.id}-${index}`} style={[ segment.color ? { color: segment.color } : null, segment.backgroundColor ? { backgroundColor: segment.backgroundColor } : null, ]}>
            {segment.text}
          </Text>
        ))}
      </Animated.Text>
    </Animated.View>
  );
};

