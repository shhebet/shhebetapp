import UIKit
import WebKit

final class ViewController: UIViewController, WKUIDelegate, WKNavigationDelegate {
    private var webView: WKWebView!

    override func loadView() {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        if #available(iOS 10.0, *) {
            configuration.mediaTypesRequiringUserActionForPlayback = []
        }
        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.uiDelegate = self
        webView.navigationDelegate = self
        view = webView
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.933, green: 0.957, blue: 0.949, alpha: 1)
        guard let resourceRoot = Bundle.main.resourceURL?.appendingPathComponent("Web") else {
            return
        }
        let index = resourceRoot.appendingPathComponent("index.html")
        webView.loadFileURL(index, allowingReadAccessTo: resourceRoot)
    }
}

