"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chartConfig = {
    type: "line",
    scaleOverride: true,
    scaleSteps: 10,
    data: {
        labels: [1],
        datasets: [{
                data: [0],
                label: "Score",
                borderColor: "#84CB53",
                fill: false,
            }],
    },
    options: {
        maintainAspectRatio: false,
        title: {
            display: true,
            text: "Score in individual generations (in pipes count)",
        },
        scales: {
            yAxes: [
                {
                    scaleLabel: {
                        display: true,
                        labelString: "Score",
                    },
                    id: "y-axis-1",
                    type: "linear",
                    display: true,
                    position: "left",
                    ticks: {
                        min: 0,
                        beginAtZero: true,
                        callback: function (value, index, values) {
                            if (Math.floor(value) === value) {
                                return value;
                            }
                        },
                    },
                },
            ],
            xAxes: [
                {
                    scaleLabel: {
                        display: true,
                        labelString: "Generation",
                    },
                },
            ],
        },
    },
};
