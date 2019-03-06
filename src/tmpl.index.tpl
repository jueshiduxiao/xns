<!DOCTYPE HTML>
<html>
<head>
    <title>Index of <%= indexName %></title>
    <script>
      function goto(url) {
        var pathname = window.location.pathname;
        if (!pathname.match(/\/$/)) {
          pathname += '/';
        }
        alert(pathname + url);
        window.location.href = pathname + url;
      }
      function gotoParent() {
        var pathname = window.location.pathname;
        if (!pathname.match(/\/$/)) {
          window.location.href = '.';
        } else {
          window.location.href = '..';
        }
      }
    </script>
</head>
<body>
    <h1>Index of <%= indexName %></h1>
    <ul>
        <li><a href="javascript:(gotoParent())">Parent Directory</a></li>
        <% fileList.forEach(function(file) { %>
        <li><a href="javascript:goto('<%= file %>')"> <%= file %></a></li>
        <% }); %>
    </ul>
</body>
</html>
