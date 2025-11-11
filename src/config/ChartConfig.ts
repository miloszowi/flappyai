export const chartConfig: Object = {
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
        }, {
            data: [0],
            label: "Birds with Score >= 1",
            borderColor: "#FF6B6B",
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
                        callback: function (value: number, index: number, values: Array<number>) {
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
