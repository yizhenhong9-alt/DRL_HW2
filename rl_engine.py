import numpy as np
import random

class CliffWalkingEnv:
    def __init__(self, height=4, width=12):
        self.height = height
        self.width = width
        self.start_state = (height - 1, 0)
        self.goal_state = (height - 1, width - 1)
        self.cliff = [(height - 1, i) for i in range(1, width - 1)]
        self.reset()

    def reset(self):
        self.current_state = self.start_state
        return self.current_state

    def step(self, action):
        # 0: Up, 1: Down, 2: Left, 3: Right
        r, c = self.current_state
        if action == 0: # Up
            r = max(0, r - 1)
        elif action == 1: # Down
            r = min(self.height - 1, r + 1)
        elif action == 2: # Left
            c = max(0, c - 1)
        elif action == 3: # Right
            c = min(self.width - 1, c + 1)

        new_state = (r, c)
        
        if new_state in self.cliff:
            reward = -100
            done = False
            self.current_state = self.start_state
        elif new_state == self.goal_state:
            reward = -1
            done = True
            self.current_state = new_state
        else:
            reward = -1
            done = False
            self.current_state = new_state
            
        return self.current_state, reward, done

class QLearningAgent:
    def __init__(self, height, width, alpha=0.1, gamma=0.9, epsilon=0.1):
        # 建立狀態-動作價值函數 Q(s, a)
        self.q_table = np.zeros((height, width, 4))
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon

    def choose_action(self, state):
        # ε-greedy 策略
        if random.random() < self.epsilon:
            return random.randint(0, 3)
        else:
            return np.argmax(self.q_table[state[0], state[1]])

    def update(self, state, action, reward, next_state):
        # 更新 Q(s, a) - Off-policy
        best_next_action = np.argmax(self.q_table[next_state[0], next_state[1]])
        td_target = reward + self.gamma * self.q_table[next_state[0], next_state[1], best_next_action]
        td_error = td_target - self.q_table[state[0], state[1], action]
        self.q_table[state[0], state[1], action] += self.alpha * td_error

class SarsaAgent:
    def __init__(self, height, width, alpha=0.1, gamma=0.9, epsilon=0.1):
        # 建立狀態-動作價值函數 Q(s, a)
        self.q_table = np.zeros((height, width, 4))
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon

    def choose_action(self, state):
        # ε-greedy 策略
        if random.random() < self.epsilon:
            return random.randint(0, 3)
        else:
            return np.argmax(self.q_table[state[0], state[1]])

    def update(self, state, action, reward, next_state, next_action):
        # 更新 Q(s, a) - On-policy
        td_target = reward + self.gamma * self.q_table[next_state[0], next_state[1], next_action]
        td_error = td_target - self.q_table[state[0], state[1], action]
        self.q_table[state[0], state[1], action] += self.alpha * td_error
