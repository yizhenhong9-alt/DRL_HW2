let rewardChart = null;

async function train() {
    const btn = document.getElementById('train-btn');
    btn.disabled = true;
    btn.textContent = 'Training...';

    const params = {
        width: parseInt(document.getElementById('width').value),
        height: parseInt(document.getElementById('height').value),
        episodes: parseInt(document.getElementById('episodes').value),
        alpha: parseFloat(document.getElementById('alpha').value),
        gamma: parseFloat(document.getElementById('gamma').value),
        epsilon: parseFloat(document.getElementById('epsilon').value)
    };

    try {
        const response = await fetch('/train', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });
        const data = await response.json();

        updateChart(data.q_rewards, data.s_rewards);
        // First render with arrows
        await renderGrid('q-grid', params.height, params.width, [], 'path-q', data.q_policy);
        await renderGrid('sarsa-grid', params.height, params.width, [], 'path-sarsa', data.s_policy);
        
        // Then animate path
        await renderGrid('q-grid', params.height, params.width, data.q_path, 'path-q', data.q_policy);
        await renderGrid('sarsa-grid', params.height, params.width, data.s_path, 'path-sarsa', data.s_policy);
        
        updateAnalysis(data, params);

    } catch (error) {
        console.error('Training failed:', error);
        alert('An error occurred during training.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Run Training';
    }
}

function updateAnalysis(data, params) {
    const qRewards = data.q_rewards;
    const sRewards = data.s_rewards;
    
    // 1. Performance
    const qAvgLast50 = qRewards.slice(-50).reduce((a, b) => a + b, 0) / 50;
    const sAvgLast50 = sRewards.slice(-50).reduce((a, b) => a + b, 0) / 50;
    const perfText = `在 ${params.episodes} 回合後，Q-Learning 的最終平均獎勵約為 ${qAvgLast50.toFixed(1)}，SARSA 約為 ${sAvgLast50.toFixed(1)}。Q-Learning 由於是 Off-policy，更新時不考慮探索動作的風險，通常能更快找到理論上的最短路徑；而 SARSA 作為 On-policy，學習過程較為平緩，收斂曲線通常比 Q-Learning 更早進入穩定期。`;
    document.getElementById('analysis-perf').textContent = perfText;

    // 2. Policy Behavior
    const qPath = data.q_path;
    const sPath = data.s_path;
    
    let policyText = "視覺化路徑顯示：";
    if (qPath.length < sPath.length) {
        policyText += `Q-Learning 找到了更短的路徑 (${qPath.length} 步)，其路徑傾向於「冒險」，緊貼懸崖邊緣以縮短距離。`;
    } else {
        policyText += `兩者路徑長度相近 (${qPath.length} vs ${sPath.length})，但 Q-Learning 仍然傾向於最優化預期獎勵。`;
    }
    
    policyText += ` 相較之下，SARSA 的路徑長度為 ${sPath.length} 步，其行為顯然更為「保守」，傾向於遠離懸崖以避免因 ε 探索而掉入懸崖。`;
    document.getElementById('analysis-policy').textContent = policyText;

    // 3. Stability
    const qVariance = calculateVariance(qRewards.slice(-100));
    const sVariance = calculateVariance(sRewards.slice(-100));
    const stabilityText = `穩定性分析顯示，SARSA 的獎勵波動 (方差: ${sVariance.toFixed(0)}) 通常小於 Q-Learning (方差: ${qVariance.toFixed(0)})。這是因為 SARSA 在更新 Q 值時考慮了下一個動作（包含隨機探索），因此它會學習到規避「可能出錯」的區域。探索率 ε = ${params.epsilon} 對 Q-Learning 影響巨大，使其在訓練中即便已找到最優路徑，仍會因隨機探索掉入懸崖；而 SARSA 則會為了應對這 ${params.epsilon * 100}% 的探索可能，選擇更穩健的策略。`;
    document.getElementById('analysis-stability').textContent = stabilityText;
}

function calculateVariance(arr) {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;
}

function updateChart(qRewards, sRewards) {
    const ctx = document.getElementById('rewardChart').getContext('2d');
    
    if (rewardChart) {
        rewardChart.destroy();
    }

    const windowSize = 20;
    const smooth = (arr) => arr.map((_, i) => {
        const start = Math.max(0, i - windowSize);
        const subset = arr.slice(start, i + 1);
        return subset.reduce((a, b) => a + b, 0) / subset.length;
    });

    rewardChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: qRewards.map((_, i) => i + 1),
            datasets: [
                {
                    label: 'Q-Learning',
                    data: smooth(qRewards),
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: true,
                    tension: 0.1
                },
                {
                    label: 'SARSA',
                    data: smooth(sRewards),
                    borderColor: '#ec4899',
                    backgroundColor: 'rgba(236, 72, 153, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: true,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: {
                    title: { display: true, text: 'Smoothing Total Reward', color: '#94a3b8' },
                    grid: { color: 'rgba(51, 65, 85, 0.5)' },
                    ticks: { color: '#94a3b8' }
                },
                x: {
                    title: { display: true, text: 'Episodes', color: '#94a3b8' },
                    grid: { color: 'rgba(51, 65, 85, 0.5)' },
                    ticks: { color: '#94a3b8' }
                }
            },
            plugins: {
                legend: { position: 'top', labels: { color: '#f8fafc', usePointStyle: true } }
            }
        }
    });
}

async function renderGrid(containerId, height, width, path, pathClass, policy = null) {
    const container = document.getElementById(containerId);
    
    if (!path || path.length === 0) {
        container.innerHTML = '';
        container.style.gridTemplateColumns = `repeat(${width}, 25px)`;
    }

    const cells = [];
    const actionMap = { 0: 'up', 1: 'down', 2: 'left', 3: 'right' };

    for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
            let cell;
            if (!path || path.length === 0) {
                cell = document.createElement('div');
                cell.className = 'cell';
                
                if (r === height - 1 && c === 0) {
                    cell.classList.add('start');
                    cell.textContent = 'S';
                } else if (r === height - 1 && c === width - 1) {
                    cell.classList.add('goal');
                    cell.textContent = 'G';
                } else if (r === height - 1 && c > 0 && c < width - 1) {
                    cell.classList.add('cliff');
                } else if (policy) {
                    const arrow = document.createElement('div');
                    arrow.className = `arrow ${actionMap[policy[r][c]]}`;
                    arrow.innerHTML = '➤';
                    cell.appendChild(arrow);
                }
                container.appendChild(cell);
            } else {
                cell = container.children[r * width + c];
            }
            cells.push({ r, c, element: cell });
        }
    }

    if (path && path.length > 0) {
        cells.forEach(c => c.element.classList.remove(pathClass));
        for (const step of path) {
            const cellInfo = cells.find(c => c.r === step[0] && c.c === step[1]);
            if (cellInfo) {
                cellInfo.element.classList.add(pathClass);
                await new Promise(resolve => setTimeout(resolve, 30));
            }
        }
    }
}

document.getElementById('train-btn').addEventListener('click', train);

window.onload = () => {
    const h = parseInt(document.getElementById('height').value);
    const w = parseInt(document.getElementById('width').value);
    renderGrid('q-grid', h, w, [], '');
    renderGrid('sarsa-grid', h, w, [], '');
};
