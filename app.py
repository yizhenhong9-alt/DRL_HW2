from flask import Flask, render_template, jsonify, request
from rl_engine import CliffWalkingEnv, QLearningAgent, SarsaAgent
import numpy as np

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/train', methods=['POST'])
def train():
    data = request.json
    height = int(data.get('height', 4))
    width = int(data.get('width', 12))
    episodes = int(data.get('episodes', 500))
    alpha = float(data.get('alpha', 0.1))
    gamma = float(data.get('gamma', 0.9))
    epsilon = float(data.get('epsilon', 0.1))

    max_train_steps = height * width * 10

    # Q-Learning
    q_env = CliffWalkingEnv(height, width)
    q_agent = QLearningAgent(height, width, alpha, gamma, epsilon)
    q_rewards = []
    
    for _ in range(episodes):
        state = q_env.reset()
        total_reward = 0
        done = False
        steps = 0
        while not done and steps < max_train_steps:
            action = q_agent.choose_action(state)
            next_state, reward, done = q_env.step(action)
            q_agent.update(state, action, reward, next_state)
            state = next_state
            total_reward += reward
            steps += 1
        q_rewards.append(total_reward)

    # SARSA
    s_env = CliffWalkingEnv(height, width)
    s_agent = SarsaAgent(height, width, alpha, gamma, epsilon)
    s_rewards = []
    
    for _ in range(episodes):
        state = s_env.reset()
        action = s_agent.choose_action(state)
        total_reward = 0
        done = False
        steps = 0
        while not done and steps < max_train_steps:
            next_state, reward, done = s_env.step(action)
            next_action = s_agent.choose_action(next_state)
            s_agent.update(state, action, reward, next_state, next_action)
            state = next_state
            action = next_action
            total_reward += reward
            steps += 1
        s_rewards.append(total_reward)

    # Get final paths and policies
    def get_results(agent, env):
        # Policy: Best action for each state
        best_actions = np.argmax(agent.q_table, axis=2).tolist()
        
        # Path
        state = env.reset()
        path = [state]
        done = False
        max_path_steps = height * width * 3
        steps = 0
        while not done and steps < max_path_steps:
            action = np.argmax(agent.q_table[state[0], state[1]])
            state, _, done = env.step(action)
            path.append(state)
            steps += 1
        return path, best_actions

    q_path, q_policy = get_results(q_agent, q_env)
    s_path, s_policy = get_results(s_agent, s_env)

    return jsonify({
        'q_rewards': q_rewards,
        's_rewards': s_rewards,
        'q_path': q_path,
        's_path': s_path,
        'q_policy': q_policy,
        's_policy': s_policy
    })

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
