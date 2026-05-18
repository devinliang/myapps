document.getElementById('calculate-btn').addEventListener('click', function() {
    const weight = parseFloat(document.getElementById('weight').value);
    const height = parseFloat(document.getElementById('height').value);
    const resultDiv = document.getElementById('result');

    if (isNaN(weight) || isNaN(height) || height === 0) {
        resultDiv.textContent = '請輸入有效的體重與身高數值。';
        return;
    }

    // height input is in cm, convert to meters
    const hMeters = height / 100;
    const bmi = weight / (hMeters * hMeters);
    resultDiv.textContent = `您的BMI為 ${bmi.toFixed(2)}。`;
});