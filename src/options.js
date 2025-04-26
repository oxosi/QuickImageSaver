// Function to handle page load
document.addEventListener('DOMContentLoaded', () => {
  const closeButton = document.getElementById('closeBtn');
  
  // 閉じるボタンの処理
  closeButton.addEventListener('click', function() {
    window.close();
  });
  
  // Enterキーが押されたときの処理
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
      window.close();
    }
  });
}); 