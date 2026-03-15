(function () {
    const canvasNameEl = document.getElementById("canvas-name");
    const canvasSizeEl = document.getElementById("canvas-size");
    const cursorCoordsEl = document.getElementById("cursor-coords");
    const connectionStatusEl = document.getElementById("connection-status");
    const canvasGridEl = document.getElementById("canvas-grid");
    const savePngBtn = document.getElementById("save-png-btn");

    const searchParams = new URLSearchParams(window.location.search);
    const authToken = searchParams.get("token");

    let currentCanvas = null;
    let socket = null;
    let reconnectTimer = null;

    function setConnectionState(state, label) {
        connectionStatusEl.dataset.state = state;
        connectionStatusEl.textContent = label;
    }

    function getDotKey(x, y) {
        return `${x},${y}`;
    }

    function getCanvasNameFromQuery() {
        return searchParams.get("canvas");
    }

    async function getActiveCanvasName() {
        const requested = getCanvasNameFromQuery();
        if (requested) {
            return requested;
        }

        const fetchOptions = authToken ? { headers: { "Authorization": `Bearer ${authToken}` } } : {};
        const response = await fetch("/api/canvases", fetchOptions);
        if (!response.ok) {
            throw new Error("Failed to load canvas list.");
        }

        const payload = await response.json();
        return payload.activeCanvas || payload.canvases?.[0]?.name || null;
    }

    function applyMeta(canvas) {
        canvasNameEl.textContent = canvas.name;
        canvasSizeEl.textContent = `${canvas.size} x ${canvas.size}`;
        canvasGridEl.style.gridTemplateColumns = `repeat(${canvas.size}, 1fr)`;
    }

    function createPixel(x, y, color) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "pixel";
        cell.dataset.x = String(x);
        cell.dataset.y = String(y);
        cell.setAttribute("aria-label", `pixel ${x},${y}`);
        cell.style.backgroundColor = color || "var(--grid-empty)";
        cell.addEventListener("mouseenter", () => {
            cursorCoordsEl.textContent = `${x}, ${y}`;
        });
        return cell;
    }

    function generatePng(canvas, pixelScale) {
        const exportCanvas = document.createElement("canvas");
        exportCanvas.width = canvas.size * pixelScale;
        exportCanvas.height = canvas.size * pixelScale;

        const context = exportCanvas.getContext("2d");
        context.clearRect(0, 0, exportCanvas.width, exportCanvas.height);

        for (const [key, color] of Object.entries(canvas.dots)) {
            if (!color) {
                continue;
            }

            const [x, y] = key.split(",").map(Number);
            context.fillStyle = color;
            context.fillRect(x * pixelScale, y * pixelScale, pixelScale, pixelScale);
        }

        return exportCanvas.toDataURL("image/png");
    }

    function downloadPng() {
        if (!currentCanvas) {
            return;
        }

        const link = document.createElement("a");
        const safeName = currentCanvas.name.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "canvas";
        link.href = generatePng(currentCanvas, 16);
        link.download = `${safeName}.png`;
        link.click();
    }

    function flashCell(cell) {
        cell.classList.remove("flash");
        window.requestAnimationFrame(() => {
            cell.classList.add("flash");
        });
    }

    function renderCanvas(canvas) {
        currentCanvas = canvas;
        applyMeta(canvas);
        canvasGridEl.replaceChildren();

        for (let y = 0; y < canvas.size; y += 1) {
            for (let x = 0; x < canvas.size; x += 1) {
                const color = canvas.dots[getDotKey(x, y)];
                canvasGridEl.appendChild(createPixel(x, y, color));
            }
        }

        savePngBtn.disabled = false;
    }

    function findCell(x, y) {
        return canvasGridEl.querySelector(`.pixel[data-x="${x}"][data-y="${y}"]`);
    }

    function updateDot(x, y, color) {
        if (!currentCanvas) {
            return;
        }

        const key = getDotKey(x, y);
        if (color) {
            currentCanvas.dots[key] = color;
        } else {
            delete currentCanvas.dots[key];
        }

        const cell = findCell(x, y);
        if (!cell) {
            return;
        }

        cell.style.backgroundColor = color || "var(--grid-empty)";
        flashCell(cell);
    }

    function resetDots() {
        if (!currentCanvas) {
            return;
        }

        currentCanvas.dots = {};
        for (const cell of canvasGridEl.querySelectorAll(".pixel")) {
            cell.style.backgroundColor = "var(--grid-empty)";
        }
    }

    function scheduleReconnect() {
        if (reconnectTimer !== null) {
            window.clearTimeout(reconnectTimer);
        }

        reconnectTimer = window.setTimeout(() => {
            connect();
        }, 2000);
    }

    function handleMessage(message) {
        switch (message.type) {
            case "init":
                renderCanvas(message.canvas);
                break;
            case "dot":
                updateDot(message.x, message.y, message.color);
                break;
            case "clear":
                updateDot(message.x, message.y, null);
                break;
            case "reset":
                resetDots();
                break;
            default:
                break;
        }
    }

    async function connect() {
        try {
            const canvasName = await getActiveCanvasName();
            if (!canvasName) {
                setConnectionState("closed", "no canvas");
                currentCanvas = null;
                savePngBtn.disabled = true;
                canvasNameEl.textContent = "none";
                canvasSizeEl.textContent = "-";
                return;
            }

            setConnectionState("connecting", "connecting");
            const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            let wsUrl = `${protocol}//${window.location.host}/ws?canvas=${encodeURIComponent(canvasName)}`;
            if (authToken) {
                wsUrl += `&token=${encodeURIComponent(authToken)}`;
            }
            socket = new WebSocket(wsUrl);

            socket.addEventListener("open", () => {
                setConnectionState("open", "live");
            });

            socket.addEventListener("message", (event) => {
                let payload;
                try {
                    payload = JSON.parse(event.data);
                } catch (parseError) {
                    console.warn("Failed to parse WebSocket message:", parseError);
                    return;
                }
                handleMessage(payload);
            });

            socket.addEventListener("close", () => {
                setConnectionState("closed", "reconnecting");
                currentCanvas = null;
                savePngBtn.disabled = true;
                scheduleReconnect();
            });

            socket.addEventListener("error", () => {
                setConnectionState("closed", "error");
            });
        } catch (error) {
            setConnectionState("closed", "retrying");
            currentCanvas = null;
            savePngBtn.disabled = true;
            canvasNameEl.textContent = "unavailable";
            canvasSizeEl.textContent = "-";
            scheduleReconnect();
        }
    }

    canvasGridEl.addEventListener("mouseleave", () => {
        cursorCoordsEl.textContent = "-";
    });

    savePngBtn.addEventListener("click", downloadPng);

    connect();
})();
